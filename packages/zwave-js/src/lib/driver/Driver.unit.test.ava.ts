/* eslint-disable @typescript-eslint/no-empty-function */
import { assertZWaveErrorAva, ZWaveErrorCodes } from "@zwave-js/core";
// import { Message, MessageType, messageTypes } from "@zwave-js/serial";
import { MockSerialPort } from "@zwave-js/serial/mock";
import test from "ava";
import proxyquire from "proxyquire";
import sinon from "sinon";
import { createAndStartDriver, PORT_ADDRESS } from "../test/utils";

// @messageTypes(MessageType.Request, 0xff)
// class TestMessage extends Message {}

// load the driver with stubbed out Serialport
const { Driver } = proxyquire<typeof import("./Driver")>("./Driver", {
	"@zwave-js/serial": {
		ZWaveSerialPort: MockSerialPort,
	},
});

test.serial("starting the driver should open a new serialport", async (t) => {
	const driver = new Driver(PORT_ADDRESS, {
		testingHooks: {
			skipBootloaderCheck: true,
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
	t.is(portInstance.openStub.callCount, 1);
	await driver.destroy();
});

test.serial("starting the driver should only work once", async (t) => {
	const driver = new Driver(PORT_ADDRESS, {
		testingHooks: {
			skipBootloaderCheck: true,
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
	t.is(portInstance.openStub.callCount, 1);
	await driver.destroy();
});

test.serial(
	"the driver start promise should only be fulfilled after the port was opened",
	async (t) => {
		const driver = new Driver(PORT_ADDRESS, {
			testingHooks: {
				skipBootloaderCheck: true,
				skipControllerIdentification: true,
				skipNodeInterview: true,
			},
			logConfig: { enabled: false },
		});
		// swallow error events during testing
		driver.on("error", () => {});

		// start the driver
		const fulfilledSpy = sinon.spy();
		const startPromise = driver.start().then(fulfilledSpy);
		t.true(fulfilledSpy.notCalled);
		// Opening the mock port succeeds by default
		await startPromise;
		await driver.destroy();
	},
);

test.serial(
	"the driver start promise should be rejected if the port opening fails",
	async (t) => {
		const driver = new Driver(PORT_ADDRESS, {
			attempts: { openSerialPort: 1 },
			testingHooks: {
				skipBootloaderCheck: true,
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
		portInstance.openStub.callsFake(() =>
			Promise.reject(new Error("NOPE")),
		);

		await t.throwsAsync(startPromise, { message: /NOPE/ });
		await driver.destroy();
	},
);

test.serial(
	"after a failed driver start, starting again should not be possible",
	async (t) => {
		const driver = new Driver(PORT_ADDRESS, {
			attempts: { openSerialPort: 1 },
			testingHooks: {
				skipBootloaderCheck: true,
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
		portInstance.openStub.rejects(new Error("NOPE"));
		await t.throwsAsync(startPromise, { message: /NOPE/ });

		// try to start again
		await assertZWaveErrorAva(t, () => driver.start(), {
			errorCode: ZWaveErrorCodes.Driver_Destroyed,
		});

		await driver.destroy();
	},
);

test.serial(
	`starting the driver should throw if no "error" handler is attached`,
	async (t) => {
		const driver = new Driver(PORT_ADDRESS, {
			// Setting testingHooks disables the check, so don't set it
			logConfig: { enabled: false },
		});
		// start the driver
		await assertZWaveErrorAva(t, () => driver.start(), {
			errorCode: ZWaveErrorCodes.Driver_NoErrorHandler,
		});
	},
);

test.serial(
	"the driver passes errors from the serialport through",
	async (t) => {
		const { driver, serialport } = await createAndStartDriver();
		const errorSpy = sinon.spy();
		driver.on("error", errorSpy);
		serialport.emit("error", new Error("foo"));
		t.is(errorSpy.callCount, 1);
		t.true(errorSpy.firstCall.args[0].message.includes("foo"));
	},
);

test.serial("the constructor should throw on duplicate security keys", (t) => {
	let driver: import("./Driver").Driver;
	t.teardown(async () => {
		if (driver) {
			await driver.destroy();
			driver.removeAllListeners();
		}
	});

	assertZWaveErrorAva(
		t,
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

// describe.skip("sending messages", () => {
// 	test.serial("should not be possible if the driver wasn't started", async (t) => {
// 		const driver = new Driver(PORT_ADDRESS, {
// 			testingHooks: {
// 				skipBootloaderCheck: true,
// 				skipControllerIdentification: true,
// 				skipNodeInterview: true,
// 			},
// 			logConfig: { enabled: false },
// 		});
// 		// swallow error events during testing
// 		driver.on("error", () => {});

// 		const msg = new TestMessage(driver);
// 		await assertZWaveErrorAva(t, () => driver.sendMessage(msg), {
// 			errorCode: ZWaveErrorCodes.Driver_NotReady,
// 		});

// 		await driver.destroy();
// 	});

// 	test.serial("should not be possible if the driver hasn't completed starting", async (t) => {
// 		const driver = new Driver(PORT_ADDRESS, {
// 			testingHooks: {
// 				skipBootloaderCheck: true,
// 				skipControllerIdentification: true,
// 				skipNodeInterview: true,
// 			},
// 			logConfig: { enabled: false },
// 		});
// 		// swallow error events during testing
// 		driver.on("error", () => {});

// 		// start the driver, but don't open the serial port yet
// 		driver.start();

// 		const msg = new TestMessage(driver);
// 		await assertZWaveErrorAva(t, () => driver.sendMessage(msg), {
// 			errorCode: ZWaveErrorCodes.Driver_NotReady,
// 		});

// 		await driver.destroy();
// 	});

// 	test.serial("should not be possible if the driver failed to start", async (t) => {
// 		const driver = new Driver(PORT_ADDRESS, {
// 			testingHooks: {
// 				skipBootloaderCheck: true,
// 				skipControllerIdentification: true,
// 				skipNodeInterview: true,
// 			},
// 			logConfig: { enabled: false },
// 		});
// 		// swallow error events during testing
// 		driver.on("error", () => {});

// 		// start the driver
// 		const startPromise = driver.start();

// 		// fail opening of the serialport
// 		const portInstance = MockSerialPort.getInstance(PORT_ADDRESS)!;
// 		portInstance.openStub.rejects(new Error("NOPE"));
// 		await expect(startPromise).rejects.toThrow("NOPE");

// 		const msg = new TestMessage(driver);
// 		await assertZWaveErrorAva(t, () => driver.sendMessage(msg), {
// 			errorCode: ZWaveErrorCodes.Driver_NotReady,
// 		});

// 		await driver.destroy();
// 	});

// 	// test.serial("invalid data before a message should be ignored", async (t) => {
// 	// 	const { driver, serialport } = await createAndStartDriver();

// 	// 	const req = new MockRequestMessageWithExpectation(driver);

// 	// 	// send a message
// 	// 	const resolvedSpy = sinon.spy();
// 	// 	const promise = driver.sendMessage(req);
// 	// 	promise.then(resolvedSpy);
// 	// 	// trigger the send queue
// 	// 	jest.runOnlyPendingTimers();

// 	// 	t.true(resolvedSpy.notCalled);

// 	// 	// receive the message (with some noise ahead of it)
// 	// 	const resp = new MockResponseMessage(driver);
// 	// 	await serialport.receiveData(
// 	// 		Buffer.concat([Buffer.from([0xff]), resp.serialize()]),
// 	// 	);
// 	// 	t.true(resolvedSpy.notCalled);
// 	// 	// receive the ACK
// 	// 	await serialport.receiveData(Buffer.from([MessageHeaders.ACK]));

// 	// 	const msg = await promise;
// 	// 	expect(msg).toBeInstanceOf(MockResponseMessage);

// 	// 	await driver.destroy();
// 	// });
// });

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

// 	test.serial("should send a NAK", async (t) => {
// 		const errorSpy = sinon.spy();
// 		driver.on("error", errorSpy);

// 		// receive something that's not a message header
// 		await serialport.receiveData(Buffer.from([0xff]));
// 		t.is(errorSpy.callCount, 1);
// 		assertZWaveErrorAva(t, errorSpy.mock.calls[0][0] as unknown, {
// 			errorCode: ZWaveErrorCodes.Driver_InvalidDataReceived,
// 		});

// 		// trigger the send queue
// 		jest.runAllTimers();
// 		expect(serialport.writeStub).toHaveBeenCalledWith(
// 			Buffer.from([MessageHeaders.NAK]),
// 		);
// 	});

// 	test.serial("should happen on invalid data in the receive buffer", (t) => {
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

// 	test.serial("should reject the current (pending) transaction", async (t) => {
// 		// swallow the error
// 		driver.on("error", () => {});

// 		const req = new MockRequestMessageWithExpectation(driver);

// 		// send a message
// 		const errorSpy = sinon.spy();
// 		// And catch the thrown error
// 		const promise = driver.sendMessage(req).catch(errorSpy);
// 		// trigger the send queue
// 		jest.runAllTimers();

// 		// receive something that's not a message header
// 		await serialport.receiveData(Buffer.from([0xff]));

// 		// This is necessary or the test will finish too early and fail
// 		await promise;
// 		t.is(errorSpy.callCount, 1);
// 		assertZWaveErrorAva(t, errorSpy.mock.calls[0][0] as unknown, {
// 			errorCode: ZWaveErrorCodes.Driver_Reset,
// 		});
// 	});
// });
