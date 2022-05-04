import {
	createDefaultTransportFormat,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { assertMessage, SpyTransport } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import MockDate from "mockdate";
import type { ThrowingMap } from "../../controller/Controller";
import type { Driver } from "../../driver/Driver";
import { DriverLogger } from "../../log/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";
	let driverLogger: DriverLogger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		spyTransport = new SpyTransport();
		spyTransport.format = createDefaultTransportFormat(true, true);
		driverLogger = new DriverLogger(
			new ZWaveLogContainer({
				transports: [spyTransport],
			}),
		);
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(driverLogger);

		MockDate.set(new Date().setHours(0, 0, 0, 0));
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		driverLogger.container.updateConfiguration({ enabled: false });
		MockDate.reset();
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			nodes: new Map(),
			incrementStatistics: () => {},
			removeAllListeners: () => {},
		} as any;
		driver["_driverLog"] = driverLogger;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("when an invalid CC is received, this is printed in the logs", async () => {
		// Use the normal SendData commands
		driver["_controller"]!.isFunctionSupported =
			isFunctionSupported_NoBridge;

		const node33 = new ZWaveNode(33, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node33.id,
			node33,
		);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node33["_isListening"] = true;
		node33["_isFrequentListening"] = false;
		node33.markAsAlive();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		//  « [Node 033] [REQ] [ApplicationCommand]
		//    └─[BinarySensorCCReport]
		//        type:  Motion
		//        value: true
		serialport.receiveData(Buffer.from("010800040021043003e5", "hex"));
		await wait(10);
		assertMessage(spyTransport, {
			callNumber: 1,
			message: `« [Node 033] [REQ] [ApplicationCommand]
  └─[BinarySensorCCReport] [INVALID]`,
		});
		expect(serialport.lastWrite).toEqual(ACK);
	}, 5000);
});
