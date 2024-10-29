import { CommandClasses, SecurityManager } from "@zwave-js/core";
import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import { Bytes, type ThrowingMap } from "@zwave-js/shared";
import ava, { type TestFn } from "ava";
import { setTimeout as wait } from "node:timers/promises";
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
	t.timeout(30000);

	const { driver, serialport } = await createAndStartDriver({
		securityKeys: {
			S0_Legacy: new Uint8Array(16).fill(0),
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

	driver.controller.nodes.getOrThrow = (nodeId: number) => {
		const node = driver.controller.nodes.get(nodeId);
		if (!node) throw new Error(`Node ${nodeId} not found`);
		return node;
	};

	t.context = { driver, serialport };
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

process.env.LOGLEVEL = "debug";

test("Node responses in a BridgeApplicationCommandRequest should be understood", async (t) => {
	const { driver, serialport } = t.context;

	// Repro for #1100
	const node3 = new ZWaveNode(3, driver);
	(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(3, node3);
	// Add event handlers for the nodes
	for (const node of driver.controller.nodes.values()) {
		driver["addNodeEventHandlers"](node);
	}

	node3.addCC(CommandClasses.Security, {
		isSupported: true,
		version: 1,
	});
	node3.markAsAlive();

	const ACK = Uint8Array.from([MessageHeaders.ACK]);

	const getNoncePromise = node3.commandClasses.Security.getNonce();
	await wait(1);
	// » [Node 003] [REQ] [SendData]
	// │ transmit options: 0x25
	// │ callback id:      1
	// └─[SecurityCCNonceGet]
	t.deepEqual(
		serialport.lastWrite,
		Bytes.from("0109001303029840250118", "hex"),
	);
	await wait(10);
	serialport.receiveData(ACK);

	await wait(10);

	// « [RES] [SendData]
	//     was sent: true
	serialport.receiveData(Bytes.from("0104011301e8", "hex"));
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(10);

	// « [REQ] [SendData]
	//     callback id:     1
	//     transmit status: OK
	serialport.receiveData(
		Bytes.from(
			"011800130100000100c17f7f7f7f000003000000000301000034",
			"hex",
		),
	);
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	await wait(10);

	// BridgeApplicationCommandRequest
	serialport.receiveData(
		Bytes.from("011300a80001030a98803e55e4b714973b9e00c18b", "hex"),
	);
	// » [ACK]
	t.deepEqual(serialport.lastWrite, ACK);

	t.deepEqual(await getNoncePromise, Bytes.from("3e55e4b714973b9e", "hex"));
});
