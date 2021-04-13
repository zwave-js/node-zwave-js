import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import { BasicCCSet } from "../../commandclass/BasicCC";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import {
	isFunctionSupported_All,
	isFunctionSupported_NoBridge,
} from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			nodes: new Map(),
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("when a SendData request fails, the `sendMessage/sendCommand` call should be rejected", async () => {
		jest.setTimeout(5000);
		// Use the normal SendData commands
		driver[
			"_controller"
		]!.isFunctionSupported = isFunctionSupported_NoBridge;

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["_isListening"] = true;
		node2["_isFrequentListening"] = false;
		node2.markAsAlive();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		const command = new BasicCCSet(driver, {
			nodeId: 2,
			targetValue: 99,
		});
		const promise = driver.sendCommand(command, {
			maxSendAttempts: 1,
		});

		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[BasicCCSet]
		//     └─ targetValue: 99
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010a00130203200163250181", "hex"),
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
		//   callback id:     1
		//   transmit status: NoACK
		serialport.receiveData(Buffer.from("0107001301010002e9", "hex"));
		expect(serialport.lastWrite).toEqual(ACK);

		await expect(promise).toReject();
	});

	it("when a SendDataBridge request fails, the `sendMessage/sendCommand` call should be rejected", async () => {
		jest.setTimeout(5000);
		// Use the normal SendData commands
		driver["_controller"]!.isFunctionSupported = isFunctionSupported_All;

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["_isListening"] = true;
		node2["_isFrequentListening"] = false;
		node2.markAsAlive();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		const command = new BasicCCSet(driver, {
			nodeId: 2,
			targetValue: 99,
		});
		const promise = driver.sendCommand(command, {
			maxSendAttempts: 1,
		});

		// » [Node 002] [REQ] [SendDataBridge]
		//   │ source node id:   1
		//   │ transmit options: 0x25
		//   │ route:            0, 0, 0, 0
		//   │ callback id:      1
		//   └─[BasicCCSet]
		//     └─ targetValue: 99
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010f00a90102032001632500000000013f", "hex"),
		);
		await wait(10);
		serialport.receiveData(ACK);

		await wait(50);

		// « [RES] [SendDataBridge]
		//     was sent: true
		serialport.receiveData(Buffer.from("010401a90152", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

		await wait(50);

		// « [REQ] [SendDataBridge]
		//   callback id:     1
		//   transmit status: NoACK
		serialport.receiveData(
			Buffer.from(
				"011800a90101019e007f7f7f7f7f0101070000000002070000ac",
				"hex",
			),
		);
		expect(serialport.lastWrite).toEqual(ACK);

		await expect(promise).toReject();
	});
});
