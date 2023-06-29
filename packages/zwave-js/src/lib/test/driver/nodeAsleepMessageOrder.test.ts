import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import type { ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import ava, { type TestFn } from "ava";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/_Types";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

interface TestContext {
	driver: Driver;
	serialport: MockSerialPort;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	t.timeout(30000);

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

process.env.LOGLEVEL = "debug";

test("marking a node with a pending message as asleep does not mess up the remaining transactions", async (t) => {
	const { driver, serialport } = t.context;
	// Repro from #1107

	// Node 10's awake timer elapses before its ping is rejected,
	// this causes mismatched responses for all following messages

	const node10 = new ZWaveNode(10, driver);
	const node17 = new ZWaveNode(17, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(10, node10);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(17, node17);
	// Add event handlers for the nodes
	for (const node of driver.controller.nodes.values()) {
		driver["addNodeEventHandlers"](node);
	}

	node10["isListening"] = false;
	node10["isFrequentListening"] = false;
	node10.markAsAwake();
	t.is(node10.status, NodeStatus.Awake);

	// TODO: remove hack in packages/shared/src/wrappingCounter.ts when reworking this test to the new testing setup
	(driver.getNextCallbackId as any).value = 2;
	const ACK = Buffer.from([MessageHeaders.ACK]);

	const pingPromise10 = node10.ping();
	await wait(1);
	node10.commandClasses.Basic.set(60);
	await wait(1);
	const pingPromise17 = node17.ping();
	await wait(1);
	// » [Node 010] [REQ] [SendData]
	//   │ transmit options: 0x25
	//   │ callback id:      3
	//   └─[NoOperationCC]
	t.deepEqual(
		serialport.lastWrite,
		Buffer.from("010800130a01002503c9", "hex"),
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

	node10.markAsAsleep();
	await wait(1);
	t.is(node10.status, NodeStatus.Asleep);

	// The command queue should now abort the ongoing transaction
	// » [REQ] [SendDataAbort]
	t.deepEqual(serialport.lastWrite, Buffer.from("01030016ea", "hex"));
	await wait(10);
	serialport.receiveData(ACK);

	await wait(50);

	// Callback for previous message comes
	// « [REQ] [SendData]
	//     callback id:     3
	//     transmit status: NoAck
	serialport.receiveData(
		Buffer.from(
			"011800130301019b007f7f7f7f7f010107000000000204000012",
			"hex",
		),
	);
	// await wait(1);
	t.deepEqual(serialport.lastWrite, ACK);

	// Abort was acknowledged, Ping for 10 should be failed
	await wait(50);
	t.false(await pingPromise10);

	// Now the Ping for 17 should go out
	// » [Node 017] [REQ] [SendData]
	//   │ transmit options: 0x25
	//   │ callback id:      4
	//   └─[NoOperationCC]
	t.deepEqual(
		serialport.lastWrite,
		Buffer.from("010800131101002504d5", "hex"),
	);
	serialport.receiveData(ACK);

	await wait(50);

	// Ping 17 does not get resolved by the other callback
	t.is(await Promise.race([pingPromise17, wait(50)]), undefined);

	// « [RES] [SendData]
	//     was sent: true
	serialport.receiveData(Buffer.from("0104011301e8", "hex"));
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(50);

	// Callback for ping node 17 (failed)
	// « [REQ] [SendData]
	//     callback id:     4
	//     transmit status: NoAck
	serialport.receiveData(
		Buffer.from(
			"011800130401019d007f7f7f7f7f010107000000000204000013",
			"hex",
		),
	);
	t.deepEqual(serialport.lastWrite, ACK);
	t.false(await pingPromise17);

	driver.driverLog.sendQueue(driver["sendThread"].state.context.queue);
});
