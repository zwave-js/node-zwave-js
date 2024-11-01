import {
	ZWaveLogContainer,
	createDefaultTransportFormat,
} from "@zwave-js/core";
import { SpyTransport, assertMessage } from "@zwave-js/core/test";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import { Bytes, type ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async/index.js";
import MockDate from "mockdate";
import { afterEach, beforeEach, test as baseTest } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { DriverLogger } from "../../log/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import { createAndStartDriver } from "../utils.js";
import { isFunctionSupported_NoBridge } from "./fixtures.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		serialport: MockSerialPort;
		driverLogger: DriverLogger;
		spyTransport: SpyTransport;
	};
}

// Replace all defined transports with a spy transport
const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			process.env.LOGLEVEL = "debug";

			const spyTransport = new SpyTransport();
			spyTransport.format = createDefaultTransportFormat(true, true);
			const driverLogger = new DriverLogger(
				undefined as any,
				new ZWaveLogContainer({
					transports: [spyTransport],
				}),
			);
			// Uncomment this to debug the log outputs manually
			// wasSilenced = unsilence(driverLogger);

			MockDate.set(new Date().setHours(0, 0, 0, 0));

			context.driverLogger = driverLogger;
			context.spyTransport = spyTransport;

			// Run tests
			await use(context);

			// Teardown
			// Don't spam the console when performing the other tests not related to logging

			driverLogger.container.updateConfiguration({ enabled: false });
			MockDate.reset();
		},
		{ auto: true },
	],
});

beforeEach<LocalTestContext>(async ({ context }) => {
	const { spyTransport, driverLogger } = context;
	spyTransport.spy.resetHistory();

	const { driver, serialport } = await createAndStartDriver();

	driver["_controller"] = {
		ownNodeId: 1,
		nodes: new Map(),
		incrementStatistics: () => {},
		removeAllListeners: () => {},
	} as any;
	driver["_driverLog"] = driverLogger;
	(driverLogger as any).driver = driver;

	context.driver = driver;
	context.serialport = serialport;
});

afterEach<LocalTestContext>(async ({ context }) => {
	const { driver } = context;
	driver.removeAllListeners();
	await driver.destroy();
});

test("when an invalid CC is received, this is printed in the logs", async ({ context, expect }) => {
	const { driver, serialport, spyTransport } = context;

	// Use the normal SendData commands
	driver["_controller"]!.isFunctionSupported = isFunctionSupported_NoBridge;

	const node33 = new ZWaveNode(33, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
		node33.id,
		node33,
	);
	// Add event handlers for the nodes
	for (const node of driver.controller.nodes.values()) {
		driver["addNodeEventHandlers"](node);
	}

	node33["isListening"] = true;
	node33["isFrequentListening"] = false;
	node33.markAsAlive();

	const ACK = Uint8Array.from([MessageHeaders.ACK]);

	//  « [Node 033] [REQ] [ApplicationCommand]
	//    └─[BinarySensorCCReport]
	//        type:  Motion
	//        value: true
	serialport.receiveData(Bytes.from("010800040021043003e5", "hex"));
	await wait(10);
	assertMessage(expect, spyTransport, {
		callNumber: 1,
		message: `« [Node 033] [REQ] [ApplicationCommand]
  └─[BinarySensorCCReport] [INVALID]`,
	});
	// FIXME: The log message should be BinarySensorCCReport, not BinarySensorCCReport2
	expect(serialport.lastWrite).toStrictEqual(ACK);
});
