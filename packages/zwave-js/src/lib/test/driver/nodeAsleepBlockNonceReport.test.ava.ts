import { CommandClasses, SecurityManager } from "@zwave-js/core";
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

	const { driver, serialport } = await createAndStartDriver({
		securityKeys: {
			S0_Legacy: Buffer.alloc(16, 0),
		},
		attempts: {
			sendData: 1,
		},
	});

	driver["_securityManager"] = new SecurityManager({
		networkKey: driver.options.securityKeys!.S0_Legacy!,
		ownNodeId: 1,
		nonceTimeout: driver.options.timeouts.nonce,
	});

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

test("when a NonceReport does not get delivered, it does not block further nonce requests", async (t) => {
	const { driver, serialport } = t.context;

	const node44 = new ZWaveNode(44, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(44, node44);
	// Add event handlers for the nodes
	for (const node of driver.controller.nodes.values()) {
		driver["addNodeEventHandlers"](node);
	}
	// TODO: remove hack in packages/shared/src/wrappingCounter.ts when reworking this test to the new testing setup
	(driver.getNextCallbackId as any).value = 2;

	node44["isListening"] = false;
	node44["isFrequentListening"] = false;
	node44.addCC(CommandClasses.Security, { isSupported: true });
	node44.markAsAsleep();
	t.is(node44.status, NodeStatus.Asleep);

	const ACK = Buffer.from([MessageHeaders.ACK]);

	// « [Node 044] [REQ] [ApplicationCommand]
	//   └─[SecurityCCNonceGet]
	serialport.receiveData(Buffer.from("010a0004002c029840bc00bb", "hex"));
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(50);

	// The driver should send a Nonce Report command
	t.deepEqual(serialport.lastWrite?.slice(6, 8), Buffer.from("9880", "hex"));
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
	//   callback id:     3
	//   transmit status: NoACK
	serialport.receiveData(
		Buffer.from(
			"011800130301022c007f7f7f7f7f000106000000000213092c94",
			"hex",
		),
	);
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(600);

	// The driver should NOT send a Nonce Report command again
	t.notDeepEqual(
		serialport.lastWrite?.slice(6, 8),
		Buffer.from("9880", "hex"),
	);

	await wait(50);

	// Subsequent requests must be handled again

	// « [Node 044] [REQ] [ApplicationCommand]
	//   └─[SecurityCCNonceGet]
	serialport.receiveData(Buffer.from("010a0004002c029840bc00bb", "hex"));
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(50);

	// The driver should send a Nonce Report command
	t.deepEqual(serialport.lastWrite?.slice(6, 8), Buffer.from("9880", "hex"));
	await wait(10);
	serialport.receiveData(ACK);
});
