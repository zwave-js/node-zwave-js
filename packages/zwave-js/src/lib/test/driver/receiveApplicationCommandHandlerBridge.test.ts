import { CommandClasses, SecurityManager } from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver({
			networkKey: Buffer.alloc(16, 0),
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

	it("Node responses in a BridgeApplicationCommandRequest should be understood", async () => {
		jest.setTimeout(5000);

		// Repro for #1100
		const node3 = new ZWaveNode(3, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(3, node3);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node3.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
		});
		node3.markAsAlive();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		const getNoncePromise = node3.commandClasses.Security.getNonce();
		// » [Node 003] [REQ] [SendData]
		// │ transmit options: 0x25
		// │ callback id:      1
		// └─[SecurityCCNonceGet]
		expect(serialport.lastWrite).toEqual(
			Buffer.from("0109001303029840250118", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(10);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(10);

		// « [REQ] [SendData]
		//     callback id:     1
		//     transmit status: OK
		serialport.receiveData(
			Buffer.from(
				"011800130100000100c17f7f7f7f000003000000000301000034",
				"hex",
			),
		);
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(10);

		// BridgeApplicationCommandRequest
		serialport.receiveData(
			Buffer.from("011300a80001030a98803e55e4b714973b9e00c18b", "hex"),
		);
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await expect(getNoncePromise).resolves.toEqual(
			Buffer.from("3e55e4b714973b9e", "hex"),
		);
	});
});
