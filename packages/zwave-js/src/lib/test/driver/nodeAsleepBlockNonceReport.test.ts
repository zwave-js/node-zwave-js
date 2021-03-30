import { CommandClasses, SecurityManager } from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/Types";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver({
			networkKey: Buffer.alloc(16, 0),
			attempts: {
				sendData: 1,
			},
		}));

		driver["_securityManager"] = new SecurityManager({
			networkKey: driver.options.networkKey!,
			ownNodeId: 1,
			nonceTimeout: driver.options.timeouts.nonce,
		});

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: isFunctionSupported_NoBridge,
			nodes: new Map(),
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("when a NonceReport does not get delivered, it does not block further nonce requests", async () => {
		jest.setTimeout(5000);

		const node44 = new ZWaveNode(44, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(44, node44);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}
		driver["lastCallbackId"] = 2;

		node44["_isListening"] = false;
		node44["_isFrequentListening"] = false;
		node44.addCC(CommandClasses.Security, { isSupported: true });
		node44.markAsAsleep();
		expect(node44.status).toBe(NodeStatus.Asleep);

		const ACK = Buffer.from([MessageHeaders.ACK]);

		// « [Node 044] [REQ] [ApplicationCommand]
		//   └─[SecurityCCNonceGet]
		serialport.receiveData(Buffer.from("010a0004002c029840bc00bb", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(50);

		// The driver should send a Nonce Report command
		expect(serialport.lastWrite?.slice(6, 8)).toEqual(
			Buffer.from("9880", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(50);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

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
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(600);

		// The driver should NOT send a Nonce Report command again
		expect(serialport.lastWrite?.slice(6, 8)).not.toEqual(
			Buffer.from("9880", "hex"),
		);

		await wait(50);

		// Subsequent requests must be handled again

		// « [Node 044] [REQ] [ApplicationCommand]
		//   └─[SecurityCCNonceGet]
		serialport.receiveData(Buffer.from("010a0004002c029840bc00bb", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(50);

		// The driver should send a Nonce Report command
		expect(serialport.lastWrite?.slice(6, 8)).toEqual(
			Buffer.from("9880", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);
	});
});
