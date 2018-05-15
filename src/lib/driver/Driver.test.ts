// tslint:disable:no-console
// tslint:disable:no-unused-expression
// tslint:disable:variable-name
import { assert, expect, should, use } from "chai";
import { SinonFakeTimers, spy, stub, useFakeTimers } from "sinon";

// load the driver with stubbed out Serialport
import * as proxyquire from "proxyquire";
import { MockRequestMessageWithExpectation, MockRequestMessageWithExpectation_FunctionType, MockRequestMessageWithoutExpectation, MockResponseMessage, MockSerialPort } from "../../../test/mocks";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { MessageHeaders } from "../message/Constants";
import { getExpectedResponse, getExpectedResponseStatic, Message } from "../message/Message";
import { DeepPartial, Driver as OriginalDriver, ZWaveOptions } from "./Driver";

const { Driver } = proxyquire("./Driver", {
	serialport: MockSerialPort,
}) as {
		Driver: OriginalDriver & { new(port: string, options?: DeepPartial<ZWaveOptions>): OriginalDriver },
	};

const PORT_ADDRESS = "/tty/FAKE";

function assertZWaveError(actual: any, errorCode: ZWaveErrorCodes) {
	actual.should.be.an.instanceof(ZWaveError);
	(actual as ZWaveError).code.should.equal(errorCode);
}

async function createAndStartDriver() {
	const clock = useFakeTimers();

	const driver = new Driver(PORT_ADDRESS, {skipInterview: true});
	const startPromise = driver.start();
	const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
	portInstance.doOpen();
	await startPromise;

	portInstance.closeStub.resetHistory();
	portInstance.openStub.resetHistory();
	portInstance.writeStub.resetHistory();

	return {
		driver,
		serialport: portInstance,
		clock,
	};
}

describe("lib/driver/Driver => ", () => {

	describe("starting it => ", () => {

		it("should open a new serialport", () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});
			// start the driver
			driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.openStub.should.have.been.called;
			driver.destroy();
		});

		it("should only work once", () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});
			// start the driver twice
			driver.start();
			driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.openStub.should.have.been.calledOnce;
			driver.destroy();
		});

		it("the start promise should only be fulfilled after the port was opened", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			// start the driver
			const fulfilledSpy = spy();
			const startPromise = driver.start().then(fulfilledSpy);
			fulfilledSpy.should.not.have.been.called;

			// confirm opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.doOpen();

			await startPromise.should.be.fulfilled;
			driver.destroy();
		});

		it("the start promise should be rejected if the port opening fails", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.failOpen(new Error("NOPE"));

			await startPromise.should.be.rejectedWith("NOPE");
			driver.destroy();
		});

		it("after a failed start, starting again should not be possible", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.failOpen(new Error("NOPE"));
			await startPromise.should.be.rejectedWith("NOPE");

			// try to start again
			await driver.start().should.be.rejected
				.then(err => assertZWaveError(err, ZWaveErrorCodes.Driver_Destroyed))
				;
			driver.destroy();
		});
	});

	describe("sending messages => ", () => {
		it("should not be possible if the driver wasn't started", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			const msg = new Message();
			await driver.sendMessage(msg).should.be.rejected
				.then(err => assertZWaveError(err, ZWaveErrorCodes.Driver_NotReady))
				;
			driver.destroy();
		});

		it("should not be possible if the driver hasn't completed starting", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			// start the driver, but don't open the serial port yet
			driver.start();

			const msg = new Message();
			await driver.sendMessage(msg).should.be.rejected
				.then(err => assertZWaveError(err, ZWaveErrorCodes.Driver_NotReady))
				;
			driver.destroy();
		});

		it("should not be possible if the driver failed to start", async () => {
			const driver = new Driver(PORT_ADDRESS, {skipInterview: true});

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS);
			portInstance.failOpen(new Error("NOPE"));
			await startPromise.should.be.rejected;

			const msg = new Message();
			await driver.sendMessage(msg).should.be.rejected
				.then(err => assertZWaveError(err, ZWaveErrorCodes.Driver_NotReady))
				;
			driver.destroy();
		});

		it("sendMessage for messages without an expected response should be resolved on ACK", async () => {
			const { driver, serialport, clock } = await createAndStartDriver();

			const msg = new MockRequestMessageWithoutExpectation();

			// send a message
			const resolvedSpy = spy();
			const promise = driver.sendMessage(msg).then(resolvedSpy);
			// trigger the send queue
			clock.runAll();

			resolvedSpy.should.not.have.been.called;

			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			await promise.should.become(undefined);

			clock.restore();
			driver.destroy();
		});

		it("sendMessage for messages with an expected response should be resolved on ACK + response", async () => {
			const { driver, serialport, clock } = await createAndStartDriver();

			const req = new MockRequestMessageWithExpectation();

			// send a message
			const resolvedSpy = spy();
			const promise = driver.sendMessage(req);
			promise.then(resolvedSpy);
			// trigger the send queue
			clock.runAll();

			resolvedSpy.should.not.have.been.called;

			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			resolvedSpy.should.not.have.been.called;

			// receive the message
			const resp = new MockResponseMessage();
			serialport.receiveData(resp.serialize());
			const msg = await promise;
			expect(msg).to.be.an.instanceof(MockResponseMessage);

			clock.restore();
			driver.destroy();
		});

		it("out-of-order ACK + response should be correctly resolved", async () => {
			const { driver, serialport, clock } = await createAndStartDriver();

			const req = new MockRequestMessageWithExpectation();

			// send a message
			const resolvedSpy = spy();
			const promise = driver.sendMessage(req);
			promise.then(resolvedSpy);
			// trigger the send queue
			clock.runAll();

			resolvedSpy.should.not.have.been.called;

			// receive the message
			const resp = new MockResponseMessage();
			serialport.receiveData(resp.serialize());
			resolvedSpy.should.not.have.been.called;
			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

			const msg = await promise;
			expect(msg).to.be.an.instanceof(MockResponseMessage);

			clock.restore();
			driver.destroy();
		});
	});

	describe("resetting the driver => ", () => {
		let driver: OriginalDriver;
		let serialport: MockSerialPort;
		let clock: SinonFakeTimers;

		beforeEach(async () => {
			({
				driver,
				serialport,
				clock,
			} = await createAndStartDriver());
		});
		afterEach(() => {
			clock.restore();
			driver.destroy();
			driver.removeAllListeners();
		});

		it("should send a NAK", async () => {
			const errorSpy = spy();
			driver.on("error", errorSpy);

			// receive something that's not a message header
			serialport.receiveData(Buffer.from([0xff]));
			errorSpy.should.have.been.calledOnce;
			assertZWaveError(errorSpy.getCall(0).args[0], ZWaveErrorCodes.Driver_InvalidDataReceived);

			// trigger the send queue
			clock.runAll();
			serialport.writeStub.should.have.been.calledWith(Buffer.from([MessageHeaders.NAK]));
		});

		it("should happen on invalid data in the receive buffer", () => {
			// swallow the error
			driver.on("error", spy());
			// receive an invalid message
			serialport.receiveData(Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00]));
			// trigger the send queue
			clock.runAll();
			serialport.writeStub.should.have.been.calledWith(Buffer.from([MessageHeaders.NAK]));
		});
	});

});
