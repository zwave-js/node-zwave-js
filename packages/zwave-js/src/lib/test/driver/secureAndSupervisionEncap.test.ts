import { CommandClasses, SecurityManager } from "@zwave-js/core";
import { MockSerialPort } from "@zwave-js/serial";
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
			incrementStatistics: () => {},
			removeAllListeners: () => {},
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("secure encapsulation should be used when encapsulated command requires it", async () => {
		// Repro from Qubino's testing results:

		// A command is sent to a node which supports Multilevel Switch only secure and Supervision is allowed non-securely
		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2.addCC(CommandClasses["Multilevel Switch"], {
			isSupported: true,
			isControlled: false,
			secure: true,
			version: 4,
		});
		node2.addCC(CommandClasses.Supervision, {
			isSupported: true,
			isControlled: false,
			secure: false,
			version: 0,
		});
		node2.addCC(CommandClasses.Security, {
			isSupported: true,
			version: 1,
		});
		node2.markAsAlive();

		node2.commandClasses["Multilevel Switch"].startLevelChange({
			direction: "up",
			ignoreStartLevel: true,
		});
		await wait(1);

		// The driver should send a secure command
		expect(serialport.lastWrite?.[6]).toBe(0x98);
	}, 5000);
});
