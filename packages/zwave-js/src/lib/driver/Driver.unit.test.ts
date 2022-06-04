import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import {
	Message,
	MessageType,
	messageTypes,
	MockSerialPort,
} from "@zwave-js/serial";
import { createAndStartDriver, PORT_ADDRESS } from "../test/utils";
import { Driver } from "./Driver";

@messageTypes(MessageType.Request, 0xff)
class TestMessage extends Message {}

describe("lib/driver/Driver", () => {
	describe("starting it", () => {
		it("should open a new serialport", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});
			// start the driver
			await driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			expect(portInstance.openStub).toBeCalledTimes(1);
			await driver.destroy();
		});

		it("should only work once", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});
			// start the driver twice
			await driver.start();
			await driver.start();

			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			expect(portInstance.openStub).toBeCalledTimes(1);
			await driver.destroy();
		});

		it("the start promise should only be fulfilled after the port was opened", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

			// start the driver
			const fulfilledSpy = jest.fn();
			const startPromise = driver.start().then(fulfilledSpy);
			expect(fulfilledSpy).not.toBeCalled();
			// Opening the mock port succeeds by default
			await expect(startPromise).toResolve();
			await driver.destroy();
		});

		it("the start promise should be rejected if the port opening fails", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				attempts: { openSerialPort: 1 },
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

			// start the driver
			const startPromise = driver.start();

			// fail opening of the serialport
			const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
			portInstance.openStub.mockImplementation(() =>
				Promise.reject(new Error("NOPE")),
			);

			await expect(startPromise).rejects.toThrow("NOPE");
			await driver.destroy();
		});

		it("after a failed start, starting again should not be possible", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				attempts: { openSerialPort: 1 },
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

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

			await driver.destroy();
		});

		it(`should throw if no "error" handler is attached`, async () => {
			const driver = new Driver(PORT_ADDRESS, {
				// Setting testingHooks disables the check, so don't set it
				logConfig: { enabled: false },
			});
			// start the driver
			await assertZWaveError(() => driver.start(), {
				errorCode: ZWaveErrorCodes.Driver_NoErrorHandler,
			});
		});
	});

	describe.skip("sending messages", () => {
		it("should not be possible if the driver wasn't started", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

			const msg = new TestMessage(driver);
			await assertZWaveError(() => driver.sendMessage(msg), {
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});

			await driver.destroy();
		});

		it("should not be possible if the driver hasn't completed starting", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

			// start the driver, but don't open the serial port yet
			driver.start();

			const msg = new TestMessage(driver);
			await assertZWaveError(() => driver.sendMessage(msg), {
				errorCode: ZWaveErrorCodes.Driver_NotReady,
			});

			await driver.destroy();
		});

		it("should not be possible if the driver failed to start", async () => {
			const driver = new Driver(PORT_ADDRESS, {
				testingHooks: {
					skipControllerIdentification: true,
					skipNodeInterview: true,
				},
				logConfig: { enabled: false },
			});
			// swallow error events during testing
			driver.on("error", () => {});

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

			await driver.destroy();
		});

		// it("invalid data before a message should be ignored", async () => {
		// 	const { driver, serialport } = await createAndStartDriver();

		// 	const req = new MockRequestMessageWithExpectation(driver);

		// 	// send a message
		// 	const resolvedSpy = jest.fn();
		// 	const promise = driver.sendMessage(req);
		// 	promise.then(resolvedSpy);
		// 	// trigger the send queue
		// 	jest.runOnlyPendingTimers();

		// 	expect(resolvedSpy).not.toBeCalled();

		// 	// receive the message (with some noise ahead of it)
		// 	const resp = new MockResponseMessage(driver);
		// 	await serialport.receiveData(
		// 		Buffer.concat([Buffer.from([0xff]), resp.serialize()]),
		// 	);
		// 	expect(resolvedSpy).not.toBeCalled();
		// 	// receive the ACK
		// 	await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

		// 	const msg = await promise;
		// 	expect(msg).toBeInstanceOf(MockResponseMessage);

		// 	await driver.destroy();
		// });
	});

	// describe("resetting the driver", () => {
	// 	let driver: Driver;
	// 	let serialport: MockSerialPort;

	// 	beforeEach(async () => {
	// 		({ driver, serialport } = await createAndStartDriver());
	// 	});

	// 	afterEach(() => {
	// 		await driver.destroy();
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

	it("passes errors from the serialport through", async () => {
		const { driver, serialport } = await createAndStartDriver();
		const errorSpy = jest.fn();
		driver.on("error", errorSpy);
		serialport.emit("error", new Error("foo"));
		expect(errorSpy).toBeCalledTimes(1);
		expect(errorSpy.mock.calls[0][0].message).toMatch("foo");
	});

	describe("option validation", () => {
		let driver: Driver;

		afterEach(async () => {
			if (driver) {
				await driver.destroy();
				driver.removeAllListeners();
			}
		});

		it("duplicate security keys", () => {
			assertZWaveError(
				() => {
					driver = new Driver("/dev/test", {
						securityKeys: {
							S0_Legacy: Buffer.from(
								"0102030405060708090a0b0c0d0e0f10",
								"hex",
							),
							S2_Unauthenticated: Buffer.from(
								"0102030405060708090a0b0c0d0e0f10",
								"hex",
							),
						},
					});
				},
				{
					errorCode: ZWaveErrorCodes.Driver_InvalidOptions,
				},
			);
		});
	});
});
