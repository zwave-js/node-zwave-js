import {
	createDefaultTransportFormat,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { assertMessage, SpyTransport } from "@zwave-js/core/test";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import type { ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import ava, { type TestFn } from "ava";
import MockDate from "mockdate";
import type { Driver } from "../../driver/Driver";
import { DriverLogger } from "../../log/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

interface TestContext {
	driver: Driver;
	serialport: MockSerialPort;
	driverLogger: DriverLogger;
	spyTransport: SpyTransport;
}

const test = ava as TestFn<TestContext>;

// Replace all defined transports with a spy transport
test.before((t) => {
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

	t.context.driverLogger = driverLogger;
	t.context.spyTransport = spyTransport;
});

// Don't spam the console when performing the other tests not related to logging
test.after.always((t) => {
	t.context.driverLogger.container.updateConfiguration({ enabled: false });
	MockDate.reset();
});

test.beforeEach(async (t) => {
	t.timeout(5000);

	const { spyTransport, driverLogger } = t.context;
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

	t.context.driver = driver;
	t.context.serialport = serialport;
});

test.afterEach(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

test("when an invalid CC is received, this is printed in the logs", async (t) => {
	const { driver, serialport, spyTransport } = t.context;

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

	const ACK = Buffer.from([MessageHeaders.ACK]);

	//  « [Node 033] [REQ] [ApplicationCommand]
	//    └─[BinarySensorCCReport]
	//        type:  Motion
	//        value: true
	serialport.receiveData(Buffer.from("010800040021043003e5", "hex"));
	await wait(10);
	assertMessage(t, spyTransport, {
		callNumber: 1,
		message: `« [Node 033] [REQ] [ApplicationCommand]
  └─[BinarySensorCCReport] [INVALID]`,
	});
	// FIXME: The log message should be BinarySensorCCReport, not BinarySensorCCReport2
	t.deepEqual(serialport.lastWrite, ACK);
});
