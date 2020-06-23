// load the driver with stubbed out Serialport
import {
	assertZWaveError,
	CommandClasses,
	SecurityManager,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import {
	AssociationCCReport,
	AssociationCommand,
} from "../commandclass/AssociationCC";
import { BasicCCSet } from "../commandclass/BasicCC";
import { FirmwareUpdateMetaDataCC } from "../commandclass/FirmwareUpdateMetaDataCC";
import { MultiChannelCCCommandEncapsulation } from "../commandclass/MultiChannelCC";
import { MultiCommandCCCommandEncapsulation } from "../commandclass/MultiCommandCC";
import { SecurityCCCommandEncapsulation } from "../commandclass/SecurityCC";
import { WakeUpCCIntervalSet } from "../commandclass/WakeUpCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	SendDataRequest,
	TransmitOptions,
} from "../controller/SendDataMessages";
import { MessageType } from "../message/Constants";
import { Message, messageTypes } from "../message/Message";
import { ZWaveNode } from "../node/Node";
import {
	MockRequestMessageWithExpectation,
	MockRequestMessageWithoutExpectation,
	MockResponseMessage,
} from "../test/mocks";
import { Driver } from "./Driver";

jest.mock("@zwave-js/serial", () => {
	const mdl: typeof import("@zwave-js/serial") = jest.requireActual(
		"@zwave-js/serial",
	);
	return {
		...mdl,
		ZWaveSerialPort: mdl.MockSerialPort,
	};
});

const PORT_ADDRESS = "/tty/FAKE";

async function createAndStartDriver() {
	const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
	await driver.start();
	const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;

	portInstance.openStub.mockClear();
	portInstance.closeStub.mockClear();
	portInstance.writeStub.mockClear();
	portInstance["_lastWrite"] = undefined;

	// Mock the value DB, because the original one will not be initialized
	// with skipInterview: true
	driver["_valueDB"] = new Map() as any;

	return {
		driver,
		serialport: portInstance,
	};
}

async function waitForData(port: {
	once: (event: "data", callback: (data: any) => void) => any;
}): Promise<
	MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Buffer
> {
	return new Promise((resolve) => {
		port.once("data", resolve);
	});
}

async function waitForWrite(port: {
	once: (event: "write", callback: (data: any) => void) => any;
}): Promise<
	MessageHeaders.ACK | MessageHeaders.NAK | MessageHeaders.CAN | Buffer
> {
	return new Promise((resolve) => {
		port.once("write", resolve);
	});
}

@messageTypes(MessageType.Request, 0xff)
class TestMessage extends Message {}

describe("lib/driver/Driver => ", () => {
	beforeEach(() => {
		jest.useFakeTimers();
	});

	afterEach(() => {
		jest.clearAllTimers();
		jest.useRealTimers();
	});

	describe("starting it => ", () => {
		it("should open a new serialport", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
			// start the driver
			await driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			expect(portInstance.openStub).toBeCalledTimes(1);
			driver.destroy();
		});

		it("should only work once", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });
			// start the driver twice
			await driver.start();
			await driver.start();

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
			// Opening the mock port succeeds by default
			await expect(startPromise).toResolve();
			driver.destroy();
		});

		it("the start promise should be rejected if the port opening fails", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.openStub.mockRejectedValue(new Error("NOPE"));

			await expect(startPromise).rejects.toThrow("NOPE");
			driver.destroy();
		});

		it("after a failed start, starting again should not be possible", async () => {
			const driver = new Driver(PORT_ADDRESS, { skipInterview: true });

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.openStub.mockRejectedValue(new Error("NOPE"));
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
			portInstance.openStub.mockRejectedValue(new Error("NOPE"));
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
			jest.runOnlyPendingTimers();

			expect(resolvedSpy).not.toBeCalled();
			expect(resolvedSpy).not.toBeCalled();

			// receive the ACK
			await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
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
			jest.runOnlyPendingTimers();

			expect(resolvedSpy).not.toBeCalled();

			// receive the ACK
			await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			expect(resolvedSpy).not.toBeCalled();

			// receive the message
			const resp = new MockResponseMessage(driver);
			await serialport.receiveData(resp.serialize());
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
			jest.runOnlyPendingTimers();

			expect(resolvedSpy).not.toBeCalled();

			// receive the message
			const resp = new MockResponseMessage(driver);
			await serialport.receiveData(resp.serialize());
			expect(resolvedSpy).not.toBeCalled();
			// receive the ACK
			await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

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
			jest.runOnlyPendingTimers();

			expect(resolvedSpy).not.toBeCalled();

			// receive the message (with some noise ahead of it)
			const resp = new MockResponseMessage(driver);
			await serialport.receiveData(
				Buffer.concat([Buffer.from([0xff]), resp.serialize()]),
			);
			expect(resolvedSpy).not.toBeCalled();
			// receive the ACK
			await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

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
	// 		await serialport.receiveData(Buffer.from([0xff]));
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
	// 		await serialport.receiveData(Buffer.from([0x01, 0x03, 0x00, 0x00, 0x00]));
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
	// 		await serialport.receiveData(Buffer.from([0xff]));

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
			await serialport.receiveData(Buffer.from([MessageHeaders.CAN]));

			await promise;
			expect(errorSpy).toBeCalledTimes(1);
			assertZWaveError(errorSpy.mock.calls[0][0] as unknown, {
				errorCode: ZWaveErrorCodes.Controller_MessageDropped,
			});
		});

		it.skip("should resend the current transaction otherwise", async () => {
			// swallow the error
			driver.on("error", () => {});

			// Don't expect an answer, ACK is enough
			const req = new MockRequestMessageWithoutExpectation(driver);
			req.maxSendAttempts = 2;

			// send a message
			const errorSpy = jest.fn();
			// And catch the thrown error
			const promise = driver.sendMessage(req).catch(errorSpy);

			let waitPromise = waitForWrite(serialport);
			// trigger the send queue
			// jest.advanceTimersByTime(10);
			await waitPromise;

			// Receive a CAN to trigger the resend check
			await serialport.receiveData(Buffer.from([MessageHeaders.CAN]));
			expect(errorSpy).not.toBeCalled();

			waitPromise = waitForWrite(serialport);
			// trigger the send queue again
			jest.runOnlyPendingTimers();
			await waitPromise;

			// Confirm the transmission with an ACK
			await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));
			expect(errorSpy).not.toBeCalled();

			await promise;

			// Assert we had no error
			expect(errorSpy).not.toBeCalled();
			// And make sure the serialport wrote the same data twice
			expect(serialport.writeStub).toBeCalledTimes(2);
			expect(serialport.writeStub.mock.calls[0][0]).toEqual(
				serialport.writeStub.mock.calls[1][0],
			);
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
			expect(async () => {
				await serialport.receiveData(req.serialize());
				jest.runAllTimers();
			}).not.toThrow();
		});

		it("should correctly handle multiple messages in the receive buffer", async (done) => {
			jest.useRealTimers();
			// This buffer contains a SendData transmit report and a ManufacturerSpecific report
			const data = Buffer.from(
				"010700130f000002e6010e000400020872050086000200828e",
				"hex",
			);
			await serialport.receiveData(data);

			let count = 0;
			serialport.on("write", (data) => {
				count++;
				if (count === 1)
					expect(data).toEqual(Buffer.from([MessageHeaders.ACK]));
				if (count === 2) {
					expect(data).toEqual(Buffer.from([MessageHeaders.ACK]));
					done();
				}
			});
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

	describe("computeNetCCPayloadSize() => ", () => {
		let driver: Driver;
		let node2: ZWaveNode;

		beforeEach(async () => {
			({ driver } = await createAndStartDriver());
			node2 = new ZWaveNode(2, driver);
			driver["_securityManager"] = {} as any;
			driver["_controller"] = {
				ownNodeId: 1,
				nodes: {
					has: () => true,
					get: () => node2,
					forEach: () => {},
				},
			} as any;
		});

		afterEach(() => {
			driver.destroy();
			driver.removeAllListeners();
		});

		it("should compute the correct net payload sizes", () => {
			const testMsg1 = new SendDataRequest(driver, {
				command: new SecurityCCCommandEncapsulation(driver, {
					nodeId: 2,
					encapsulated: undefined as any,
				}),
				transmitOptions: TransmitOptions.DEFAULT,
			});
			expect(driver.computeNetCCPayloadSize(testMsg1)).toBe(26);

			const testMsg2 = new SendDataRequest(driver, {
				command: new SecurityCCCommandEncapsulation(driver, {
					nodeId: 2,
					encapsulated: new MultiChannelCCCommandEncapsulation(
						driver,
						{
							nodeId: 2,
							destination: 1,
							encapsulated: undefined as any,
						},
					),
				}),
				transmitOptions: TransmitOptions.NoRoute,
			});
			expect(driver.computeNetCCPayloadSize(testMsg2)).toBe(54 - 20 - 4);

			const testMsg3 = new FirmwareUpdateMetaDataCC(driver, {
				nodeId: 2,
			});
			testMsg3.secure = true;
			expect(driver.computeNetCCPayloadSize(testMsg3)).toBe(46 - 20 - 2);
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

	describe("assemblePartialCCs()", () => {
		let driver: Driver;
		let node2: ZWaveNode;

		beforeEach(async () => {
			({ driver } = await createAndStartDriver());
			node2 = new ZWaveNode(2, driver);
			driver["_securityManager"] = new SecurityManager({
				ownNodeId: 1,
				nonceTimeout: 500,
				networkKey: Buffer.alloc(16, 1),
			});
			driver["_controller"] = {
				ownNodeId: 1,
				nodes: {
					has: () => true,
					get: () => node2,
					forEach: () => {},
				},
			} as any;
		});

		afterEach(() => {
			driver.destroy();
		});

		it("returns true when a non-partial CC is received", async () => {
			const cc = new BasicCCSet(driver, { nodeId: 2, targetValue: 50 });
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns true when a partial CC is received that expects no more reports", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns false when a partial CC is received that expects more reports", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					1, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns true when the final partial CC is received and merges its data", async () => {
			const cc1 = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					1, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const cc2 = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					4,
					5,
					6,
				]),
			});
			const msg1 = new ApplicationCommandRequest(driver, {
				command: cc1,
			});
			expect(driver["assemblePartialCCs"](msg1)).toBeFalse();

			const msg2 = new ApplicationCommandRequest(driver, {
				command: cc2,
			});
			expect(driver["assemblePartialCCs"](msg2)).toBeTrue();

			expect((msg2.command as AssociationCCReport).nodeIds).toEqual([
				1,
				2,
				3,
				4,
				5,
				6,
			]);
		});

		it("does not crash when receiving a Multi Command CC", async () => {
			const cc1 = new BasicCCSet(driver, { nodeId: 2, targetValue: 25 });
			const cc2 = new BasicCCSet(driver, { nodeId: 2, targetValue: 50 });
			const cc = new MultiCommandCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: [cc1, cc2],
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("supports nested partial/non-partial CCs", async () => {
			const cc1 = new BasicCCSet(driver, { nodeId: 2, targetValue: 25 });
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: undefined as any,
			});
			cc["decryptedCCBytes"] = cc1.serialize();
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("supports nested partial/partial CCs (part 1)", async () => {
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: undefined as any,
			});
			cc["decryptedCCBytes"] = Buffer.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				1, // reportsFollow
				1,
				2,
				3,
			]);
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("supports nested partial/partial CCs (part 2)", async () => {
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: undefined as any,
			});
			cc["decryptedCCBytes"] = Buffer.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]);
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns false when a partial CC throws Deserialization_NotImplemented during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc["mergePartialCCs"] = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.Deserialization_NotImplemented,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns false when a partial CC throws CC_NotImplemented during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc["mergePartialCCs"] = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.CC_NotImplemented,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns false when a partial CC throws PacketFormat_InvalidPayload during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc["mergePartialCCs"] = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.PacketFormat_InvalidPayload,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("passes other errors during merging through", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc["mergePartialCCs"] = () => {
				throw new ZWaveError(
					"invalid",
					ZWaveErrorCodes.Argument_Invalid,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(() => driver["assemblePartialCCs"](msg)).toThrow("invalid");
		});
	});
});
