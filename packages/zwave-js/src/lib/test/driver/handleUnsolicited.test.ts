import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { createThrowingMap, ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import { getCurrentValueValueId as getBasicCCCurrentValueValueId } from "../../commandclass/BasicCC";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";
import { isFunctionSupported_NoBridge } from "./fixtures";

describe("regression tests", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: isFunctionSupported_NoBridge,
			nodes: createThrowingMap(),
			incrementStatistics: () => {},
			removeAllListeners: () => {},
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("unsolicited commands which need special handling are passed to Node.handleCommand", async () => {
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

		const valueId = getBasicCCCurrentValueValueId(0);
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Buffer.from([MessageHeaders.ACK]);
		serialport.receiveData(Buffer.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		expect(serialport.lastWrite).toEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toEqual(5);
	}, 5000);

	it("unsolicited commands are passed to Node.handleCommand while waiting for a controller response", async () => {
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

		const valueId = getBasicCCCurrentValueValueId(0);
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		expect(serialport.lastWrite).toEqual(
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
		expect(serialport.lastWrite).toEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toEqual(5);
	}, 5000);

	it("unsolicited commands are passed to Node.handleCommand while waiting for a controller callback", async () => {
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

		const valueId = getBasicCCCurrentValueValueId(0);
		expect(node2.getValue(valueId)).toBeUndefined();

		const ACK = Buffer.from([MessageHeaders.ACK]);

		// Step 1: Send a ping and receive the response
		node2.ping();
		await wait(1);
		// » [Node 002] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      1
		//   └─[NoOperationCC]
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010800130201002501c3", "hex"),
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

		// We're now waiting for a callback. The next command must not get lost

		serialport.receiveData(Buffer.from("01090004000203200105d7", "hex"));
		// « [Node 002] [REQ] [ApplicationCommand]
		//   └─[BasicCCSet]
		//       target value: 5
		expect(serialport.lastWrite).toEqual(ACK);
		await wait(10);
		expect(node2.getValue(valueId)).toEqual(5);
	}, 5000);
});
