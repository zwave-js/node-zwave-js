import { BasicCCSet } from "@zwave-js/cc";
import { MessagePriority } from "@zwave-js/core";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import type { ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import ava, { type TestFn } from "ava";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/_Types";
import type { SendDataRequest } from "../../serialapi/transport/SendDataMessages";
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

test("when a node does not respond because it is asleep, the transaction does not get rejected", async (t) => {
	const { driver, serialport } = t.context;
	// Repro from #1078

	const node2 = new ZWaveNode(2, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(2, node2);
	// Add event handlers for the nodes
	for (const node of driver.controller.nodes.values()) {
		driver["addNodeEventHandlers"](node);
	}

	node2["isListening"] = false;
	node2["isFrequentListening"] = false;
	node2.markAsAwake();
	t.is(node2.status, NodeStatus.Awake);

	const ACK = Buffer.from([MessageHeaders.ACK]);

	const command1 = new BasicCCSet(driver, {
		nodeId: 2,
		targetValue: 99,
	});
	const basicSetPromise1 = driver.sendCommand(command1, {
		maxSendAttempts: 1,
	});

	const command2 = new BasicCCSet(driver, {
		nodeId: 2,
		targetValue: 50,
	});
	driver.sendCommand(command2, {
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
		Buffer.from("010a00130203200163250181", "hex"),
	);
	await wait(10);
	serialport.receiveData(ACK);

	await wait(50);

	// « [RES] [SendData]
	//     was sent: true
	serialport.receiveData(Buffer.from("0104011301e8", "hex"));
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(50);

	// « [REQ] [SendData]
	//   callback id:     1
	//   transmit status: NoACK
	serialport.receiveData(Buffer.from("0107001301010002e9", "hex"));
	t.deepEqual(serialport.lastWrite, ACK);
	t.is(
		await Promise.race([basicSetPromise1, wait(50).then(() => "OK")]),
		"OK",
	);

	// Both transactions should still be in the queue
	const sendQueue = driver["queue"];
	t.is(sendQueue.length, 2);
	t.is(sendQueue.get(0)?.priority, MessagePriority.WakeUp);
	t.is(sendQueue.get(1)?.priority, MessagePriority.WakeUp);
	t.is(node2.status, NodeStatus.Asleep);

	// And the order should be correct
	t.is(
		((sendQueue.get(0)?.message as SendDataRequest).command as BasicCCSet)
			.targetValue,
		99,
	);
	t.is(
		((sendQueue.get(1)?.message as SendDataRequest).command as BasicCCSet)
			.targetValue,
		50,
	);
});
