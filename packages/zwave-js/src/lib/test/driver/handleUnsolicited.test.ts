import { BasicCCValues } from "@zwave-js/cc/BasicCC";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import { createThrowingMap, type ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import ava, { type TestFn } from "ava";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

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
		isFunctionSupported: isFunctionSupported_NoBridge,
		nodes: createThrowingMap(),
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
	"unsolicited commands which need special handling are passed to Node.handleCommand",
	async (t) => {
		const { driver, serialport } = t.context;
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
		t.is(node2.getValue(valueId), undefined);

		const ACK = Buffer.from([MessageHeaders.ACK]);
		serialport.receiveData(Buffer.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		t.deepEqual(serialport.lastWrite, ACK);
		await wait(10);
		t.deepEqual(node2.getValue(valueId), 5);
	},
);

test.serial(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller response",
	async (t) => {
		const { driver, serialport } = t.context;
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
		t.is(node2.getValue(valueId), undefined);

		const ACK = Buffer.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		t.deepEqual(
			serialport.lastWrite,
			Buffer.from("010800130201002501c3", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(10);

		// We're now waiting for a response. The next command must not get lost

		serialport.receiveData(Buffer.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		t.deepEqual(serialport.lastWrite, ACK);
		await wait(10);
		t.deepEqual(node2.getValue(valueId), 5);
	},
);

test.serial(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller callback",
	async (t) => {
		const { driver, serialport } = t.context;
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
		t.is(node2.getValue(valueId), undefined);

		const ACK = Buffer.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		t.deepEqual(
			serialport.lastWrite,
			Buffer.from("010800130201002501c3", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(10);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		t.deepEqual(serialport.lastWrite, ACK);

		await wait(10);

		// We're now waiting for a callback. The next command must not get lost

		serialport.receiveData(Buffer.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		t.deepEqual(serialport.lastWrite, ACK);
		await wait(10);
		t.deepEqual(node2.getValue(valueId), 5);
	},
);
