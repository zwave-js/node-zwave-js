import { BasicCCSet } from "@zwave-js/cc";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import { Bytes, type ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async/index.js";
import ava, { type TestFn } from "ava";
import type { Driver } from "../../driver/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import { createAndStartDriver } from "../utils.js";
import {
	isFunctionSupported_All,
	isFunctionSupported_NoBridge,
} from "./fixtures.js";

interface TestContext {
	driver: Driver;
	serialport: MockSerialPort;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(5000);

	const { driver, serialport } = await createAndStartDriver();

	driver["_controller"] = {
		ownNodeId: 1,
		nodes: new Map(),
		incrementStatistics: () => {},
		removeAllListeners: () => {},
	} as any;

	t.context = { driver, serialport };
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

process.env.LOGLEVEL = "debug";

test.serial(
	"when a SendData request fails, the `sendMessage/sendCommand` call should be rejected",
	async (t) => {
		const { driver, serialport } = t.context;

		// Use the normal SendData commands
		driver["_controller"]!.isFunctionSupported =
			isFunctionSupported_NoBridge;

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

		const ACK = Uint8Array.from([MessageHeaders.ACK]);

		const command = new BasicCCSet({
			nodeId: 2,
			targetValue: 99,
		});
		const promise = driver.sendCommand(command, {
			maxSendAttempts: 1,
		});
		await wait(1);

		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[BasicCCSet]
		//     └─ targetValue: 99
		t.deepEqual(
			serialport.lastWrite,
			Bytes.from("010a00130203200163250181", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(50);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Bytes.from("0104011301e8", "hex"));
		// » [ACK]
		t.deepEqual(serialport.lastWrite, ACK);

		await wait(50);

		// « [REQ] [SendData]
		//   callback id:     1
		//   transmit status: NoACK
		serialport.receiveData(Bytes.from("0107001301010002e9", "hex"));
		t.deepEqual(serialport.lastWrite, ACK);

		await t.throwsAsync(promise);
	},
);

test.serial(
	"when a SendDataBridge request fails, the `sendMessage/sendCommand` call should be rejected",
	async (t) => {
		const { driver, serialport } = t.context;

		// Use the normal SendData commands
		driver["_controller"]!.isFunctionSupported = isFunctionSupported_All;

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

		const ACK = Uint8Array.from([MessageHeaders.ACK]);

		const command = new BasicCCSet({
			nodeId: 2,
			targetValue: 99,
		});
		const promise = driver.sendCommand(command, {
			maxSendAttempts: 1,
		});
		await wait(1);

		// » [Node 002] [REQ] [SendDataBridge]
		//   │ source node id:   1
		//   │ transmit options: 0x25
		//   │ route:            0, 0, 0, 0
		//   │ callback id:      1
		//   └─[BasicCCSet]
		//     └─ targetValue: 99
		t.deepEqual(
			serialport.lastWrite,
			Bytes.from("010f00a90102032001632500000000013f", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(50);

		// « [RES] [SendDataBridge]
		//     was sent: true
		serialport.receiveData(Bytes.from("010401a90152", "hex"));
		// » [ACK]
		t.deepEqual(serialport.lastWrite, ACK);

		await wait(50);

		// « [REQ] [SendDataBridge]
		//   callback id:     1
		//   transmit status: NoACK
		serialport.receiveData(
			Bytes.from(
				"011800a90101019e007f7f7f7f7f0101070000000002070000ac",
				"hex",
			),
		);
		t.deepEqual(serialport.lastWrite, ACK);

		await t.throwsAsync(promise);
	},
);
