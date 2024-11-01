import { BasicCCValues } from "@zwave-js/cc/BasicCC";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import { Bytes, type ThrowingMap, createThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async/index.js";
import { test as baseTest } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import { createAndStartDriver } from "../utils.js";
import { isFunctionSupported_NoBridge } from "./fixtures.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		serialport: MockSerialPort;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver, serialport } = await createAndStartDriver();

			driver["_controller"] = {
				ownNodeId: 1,
				isFunctionSupported: isFunctionSupported_NoBridge,
				nodes: createThrowingMap(),
				incrementStatistics: () => {},
				removeAllListeners: () => {},
			} as any;

			// Run tests
			await use({ driver, serialport });

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

process.env.LOGLEVEL = "debug";

test.sequential(
	"unsolicited commands which need special handling are passed to Node.handleCommand",
	async ({ context, expect }) => {
		const { driver, serialport } = context;
		// Repro from #4467

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			2,
			node2,
		);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["isListening"] = true;
		node2["isFrequentListening"] = false;
		node2.markAsAlive();

		const valueId = BasicCCValues.currentValue.id;
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Uint8Array.from([MessageHeaders.ACK]);
		serialport.receiveData(Bytes.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		expect(serialport.lastWrite).toStrictEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toStrictEqual(5);
	},
);

test.sequential(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller response",
	async ({ context, expect }) => {
		const { driver, serialport } = context;
		// Repro from #4467

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			2,
			node2,
		);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["isListening"] = true;
		node2["isFrequentListening"] = false;
		node2.markAsAlive();

		const valueId = BasicCCValues.currentValue.id;
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Uint8Array.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		expect(
			serialport.lastWrite,
		).toStrictEqual(Bytes.from("010800130201002501c3", "hex"));
		await wait(10);
		serialport.receiveData(ACK);

		await wait(10);

		// We're now waiting for a response. The next command must not get lost

		serialport.receiveData(Bytes.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		expect(serialport.lastWrite).toStrictEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toStrictEqual(5);
	},
);

test.sequential(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller callback",
	async ({ context, expect }) => {
		const { driver, serialport } = context;
		// Repro from #4467

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			2,
			node2,
		);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["isListening"] = true;
		node2["isFrequentListening"] = false;
		node2.markAsAlive();

		const valueId = BasicCCValues.currentValue.id;
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Uint8Array.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		expect(
			serialport.lastWrite,
		).toStrictEqual(Bytes.from("010800130201002501c3", "hex"));
		await wait(10);
		serialport.receiveData(ACK);

		await wait(10);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Bytes.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toStrictEqual(ACK);

		await wait(10);

		// We're now waiting for a callback. The next command must not get lost

		serialport.receiveData(Bytes.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		expect(serialport.lastWrite).toStrictEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toStrictEqual(5);
	},
);
