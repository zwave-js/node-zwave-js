// load the driver with stubbed out Serialport
import {
	MockRequestMessageWithExpectation,
	MockRequestMessageWithoutExpectation,
	MockResponseMessage,
	MockSerialPort,
} from "../../../test/mocks";
import { assertZWaveError } from "../../../test/util";
import { WakeUpCCIntervalSet } from "../commandclass/WakeUpCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { MessageHeaders, MessageType } from "../message/Constants";
import { Message, messageTypes } from "../message/Message";
import { Driver } from "./Driver";

jest.mock("serialport", () => MockSerialPort);
jest.useFakeTimers();

const PORT_ADDRESS = "/tty/FAKE";

async function createAndStartDriver() {
	const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
	const startPromise = driver.start();
	const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
	portInstance.doOpen();
	await startPromise;

	portInstance.closeStub.mockClear();
	portInstance.openStub.mockClear();
	portInstance.writeStub.mockClear();

	return {
		driver,
		serialport: portInstance,
	};
}

@messageTypes(MessageType.Request, 0xff)
class TestMessage extends Message {}

describe("lib/driver/Driver => ", () => {
	describe("starting it => ", () => {
		it("should open a new serialport", () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
			// start the driver
			driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			expect(portInstance.openStub).toBeCalledTimes(1);
			driver.destroy();
		});

		it("should only work once", () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
			// start the driver twice
			driver.start();
			driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			expect(portInstance.openStub).toBeCalledTimes(1);
			driver.destroy();
		});

		it("the start promise should only be fulfilled after the port was opened", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const fulfilledSpy = jest.fn();
			const startPromise = driver.start().then(fulfilledSpy);
			expect(fulfilledSpy).not.toBeCalled();

			// confirm opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.doOpen();

			await expect(startPromise);
			driver.destroy();
		});

		it("the start promise should be rejected if the port opening fails", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.failOpen(new Error("NOPE"));

			await expect(startPromise).rejects.toThrow("NOPE");
			driver.destroy();
		});

		it("after a failed start, starting again should not be possible", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.failOpen(new Error("NOPE"));
			await expect(startPromise).rejects.toThrow("NOPE");

			// try to start again
			await assertZWaveError(() => driver.start(), {
				errorCode: ZWaveErrorCodes.Driver_Destroyed,
			});

			driver.destroy();
		});
	});

	describe("sending messages => ", () => {
		it("should not be possible if the driver wasn't started", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			const msg = new TestMessage(driver);
			await assertZWaveError(() => driver.sendMessage(msg), {
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});

			driver.destroy();
		});

		it("should not be possible if the driver hasn't completed starting", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver, but don't open the serial port yet
			driver.start();

			const msg = new TestMessage(driver);
			await assertZWaveError(() => driver.sendMessage(msg), {
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});

			driver.destroy();
		});

		it("should not be possible if the driver failed to start", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.failOpen(new Error("NOPE"));
			await expect(startPromise).rejects.toThrow("NOPE");

			const msg = new TestMessage(driver);
			await assertZWaveError(() => driver.sendMessage(msg), {
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});

			driver.destroy();
		});

		it("sendMessage for messages without an expected response should be resolved on ACK", async () => {
			const { driver, serialport } = await createAndStartDriver();

			const msg = new MockRequestMessageWithoutExpectation(driver);

			// send a message
			const resolvedSpy = jest.fn();
			const promise = driver.sendMessage(msg).then(resolvedSpy);
			// trigger the send queue
			jest.runAllImmediates();

			expect(resolvedSpy).not.toBeCalled();
			expect(resolvedSpy).not.toBeCalled();

			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			await expect(promise).resolves.toBe(undefined);

			driver.destroy();
		});

		it("sendMessage for messages with an expected response should be resolved on ACK + response", async () => {
			const { driver, serialport } = await createAndStartDriver();

			const req = new MockRequestMessageWithExpectation(driver);

			// send a message
			const resolvedSpy = jest.fn();
			const promise = driver.sendMessage(req);
			promise.then(resolvedSpy);
			// trigger the send queue
			jest.runAllImmediates();

			expect(resolvedSpy).not.toBeCalled();

			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			expect(resolvedSpy).not.toBeCalled();

			// receive the message
			const resp = new MockResponseMessage(driver);
			serialport.receiveData(resp.serialize());
			const msg = await promise;
			expect(msg).toBeInstanceOf(MockResponseMessage);

			driver.destroy();
		});

		it("out-of-order ACK + response should be correctly resolved", async () => {
			const { driver, serialport } = await createAndStartDriver();

			const req = new MockRequestMessageWithExpectation(driver);

			// send a message
			const resolvedSpy = jest.fn();
			const promise = driver.sendMessage(req);
			promise.then(resolvedSpy);
			// trigger the send queue
			jest.runAllImmediates();

			expect(resolvedSpy).not.toBeCalled();

			// receive the message
			const resp = new MockResponseMessage(driver);
			serialport.receiveData(resp.serialize());
			expect(resolvedSpy).not.toBeCalled();
			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

			const msg = await promise;
			expect(msg).toBeInstanceOf(MockResponseMessage);

			driver.destroy();
		});

		it("invalid data before a message should be ignored", async () => {
			const { driver, serialport } = await createAndStartDriver();

			const req = new MockRequestMessageWithExpectation(driver);

			// send a message
			const resolvedSpy = jest.fn();
			const promise = driver.sendMessage(req);
			promise.then(resolvedSpy);
			// trigger the send queue
			jest.runAllImmediates();

			expect(resolvedSpy).not.toBeCalled();

			// receive the message (with some noise ahead of it)
			const resp = new MockResponseMessage(driver);
			serialport.receiveData(
				Buffer.concat([Buffer.from([0xff]), resp.serialize()]),
			);
			expect(resolvedSpy).not.toBeCalled();
			// receive the ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

			const msg = await promise;
			expect(msg).toBeInstanceOf(MockResponseMessage);

			driver.destroy();
		});
	});

	// describe("resetting the driver => ", () => {
	// 	let driver: Driver;
	// 	let serialport: MockSerialPort;

	// 	beforeEach(async () => {
	// 		({ driver, serialport } = await createAndStartDriver());
	// 	});

	// 	afterEach(() => {
	// 		driver.destroy();
	// 		driver.removeAllListeners();
	// 	});

	// 	it("should send a NAK", async () => {
	// 		const errorSpy = jest.fn();
	// 		driver.on("error", errorSpy);

	// 		// receive something that's not a message header
	// 		serialport.receiveData(Buffer.from([0xff]));
	// 		expect(errorSpy).toBeCalledTimes(1);
	// 		assertZWaveError(errorSpy.mock.calls[0][0] as unknown, {
	// 			errorCode: ZWaveErrorCodes.Driver_InvalidDataReceived,
	// 		});

	// 		// trigger the send queue
	// 		jest.runAllTimers();
	// 		expect(serialport.writeStub).toHaveBeenCalledWith(
	// 			Buffer.from([MessageHeaders.NAK]),
	// 		);
	// 	});

	// 	it("should happen on invalid data in the receive buffer", () => {
	// 		// swallow the error
	// 		driver.on("error", () => {});
	// 		// receive an invalid message
	// 		serialport.receiveData(Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00]));
	// 		// trigger the send queue
	// 		jest.runAllTimers();
	// 		expect(serialport.writeStub).toHaveBeenCalledWith(
	// 			Buffer.from([MessageHeaders.NAK]),
	// 		);
	// 	});

	// 	it("should reject the current (pending) transaction", async () => {
	// 		// swallow the error
	// 		driver.on("error", () => {});

	// 		const req = new MockRequestMessageWithExpectation(driver);

	// 		// send a message
	// 		const errorSpy = jest.fn();
	// 		// And catch the thrown error
	// 		const promise = driver.sendMessage(req).catch(errorSpy);
	// 		// trigger the send queue
	// 		jest.runAllTimers();

	// 		// receive something that's not a message header
	// 		serialport.receiveData(Buffer.from([0xff]));

	// 		// This is necessary or the test will finish too early and fail
	// 		await promise;
	// 		expect(errorSpy).toBeCalledTimes(1);
	// 		assertZWaveError(errorSpy.mock.calls[0][0] as unknown, {
	// 			errorCode: ZWaveErrorCodes.Driver_Reset,
	// 		});
	// 	});
	// });

	describe("when a CAN is received", () => {
		let driver: Driver;
		let serialport: MockSerialPort;

		beforeEach(async () => {
			({ driver, serialport } = await createAndStartDriver());
		});

		afterEach(() => {
			driver.destroy();
			driver.removeAllListeners();
		});

		it("should drop the current transaction if it has reached the maximum number of send attempts", async () => {
			// swallow the error
			driver.on("error", () => {});

			const req = new MockRequestMessageWithExpectation(driver);
			req.maxSendAttempts = 1;

			// send a message
			const errorSpy = jest.fn();
			// And catch the thrown error
			const promise = driver.sendMessage(req).catch(errorSpy);
			// trigger the send queue
			jest.runAllTimers();

			// Receive a CAN to trigger the resend check
			serialport.receiveData(Buffer.from([MessageHeaders.CAN]));

			await promise;
			expect(errorSpy).toBeCalledTimes(1);
			assertZWaveError(errorSpy.mock.calls[0][0] as unknown, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});
		});

		it("should resend the current transaction otherwise", async () => {
			// swallow the error
			driver.on("error", () => {});

			// Don't expect an answer, ACK is enough
			const req = new MockRequestMessageWithoutExpectation(driver);
			req.maxSendAttempts = 2;

			// send a message
			const errorSpy = jest.fn();
			// And catch the thrown error
			const promise = driver.sendMessage(req).catch(errorSpy);
			// trigger the send queue
			jest.runAllImmediates();

			// Receive a CAN to trigger the resend check
			serialport.receiveData(Buffer.from([MessageHeaders.CAN]));

			// trigger the send queue again
			jest.advanceTimersToNextTimer();
			jest.runAllImmediates();

			// Confirm the transmission with an ACK
			serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

			await promise;
			// Assert we had no error
			expect(errorSpy).not.toBeCalled();
			// And make sure the serialport wrote the same data twice
			expect(serialport.writeStub).toBeCalledTimes(2);
			expect(
				(serialport.writeStub.mock.calls[0][0] as Buffer).equals(
					serialport.writeStub.mock.calls[1][0],
				),
			).toBeTrue();
		});
	});

	describe("receiving messages => ", () => {
		let driver: Driver;
		let serialport: MockSerialPort;

		beforeEach(async () => {
			({ driver, serialport } = await createAndStartDriver());
		});

		afterEach(() => {
			driver.destroy();
			driver.removeAllListeners();
		});

		it("should not crash if a message is received that cannot be deserialized", () => {
			// swallow the error
			driver.on("error", () => {});

			const req = new ApplicationCommandRequest(driver, {
				command: new WakeUpCCIntervalSet(driver, {
					nodeId: 1,
					controllerNodeId: 2,
					wakeUpInterval: 5,
				}),
			});

			// Receive a CAN to trigger the resend check
			expect(() => {
				serialport.receiveData(req.serialize());
				jest.runAllTimers();
			}).not.toThrow();
		});

		it("should correctly handle multiple messages in the receive buffer", async () => {
			// This buffer contains a SendData transmit report and a ManufacturerSpecific report
			const data = Buffer.from(
				"010700130f000002e6010e000400020872050086000200828e",
				"hex",
			);

			// swallow the error
			driver.on("error", () => {});
			await (driver as any).serialport_onData(data).catch(() => {});

			// Ensure the driver ACKed two messages
			expect(serialport.writeStub).toBeCalledTimes(2);
			expect(
				(serialport.writeStub.mock.calls[0][0] as Buffer).equals(
					Buffer.from([MessageHeaders.ACK]),
				),
			).toBeTrue();
			expect(
				(serialport.writeStub.mock.calls[1][0] as Buffer).equals(
					Buffer.from([MessageHeaders.ACK]),
				),
			).toBeTrue();
		});
	});

	describe("getNextCallbackId() => ", () => {
		let driver: Driver;

		beforeEach(async () => {
			({ driver } = await createAndStartDriver());
		});

		afterEach(() => {
			driver.destroy();
			driver.removeAllListeners();
		});

		it("the automatically created callback ID should be incremented and wrap from 0xff back to 10", () => {
			let lastCallbackId: number | undefined;
			for (let i = 0; i <= 300; i++) {
				if (i === 300) {
					throw new Error(
						"incrementing the callback ID does not work somehow",
					);
				}
				const nextCallbackId = driver.getNextCallbackId();
				if (lastCallbackId === 0xff) {
					expect(nextCallbackId).toBe(1);
					break;
				} else if (lastCallbackId != null) {
					expect(nextCallbackId).toBe(lastCallbackId + 1);
				}
				lastCallbackId = nextCallbackId;
			}
		});
	});

	it("passes errors from the serialport through", async () => {
		const { driver, serialport } = await createAndStartDriver();
		const errorSpy = jest.fn();
		driver.on("error", errorSpy);
		serialport.emit("error", new Error("foo"));
		expect(errorSpy).toBeCalledTimes(1);
		expect(errorSpy.mock.calls[0][0].message).toMatch("foo");
	});
});
