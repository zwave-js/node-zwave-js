import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/_Types";
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
			nodes: new Map(),
			incrementStatistics: () => {},
			removeAllListeners: () => {},
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("marking a node with a pending message as asleep does not mess up the remaining transactions", async () => {
		// Repro from #1107

		// Node 10's awake timer elapses before its ping is rejected,
		// this causes mismatched responses for all following messages

		const node10 = new ZWaveNode(10, driver);
		const node17 = new ZWaveNode(17, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(10, node10);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(17, node17);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node10["isListening"] = false;
		node10["isFrequentListening"] = false;
		node10.markAsAwake();
		expect(node10.status).toBe(NodeStatus.Awake);

		driver["lastCallbackId"] = 2;
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
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010800130a01002503c9", "hex"),
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

		node10.markAsAsleep();
		await wait(1);
		expect(node10.status).toBe(NodeStatus.Asleep);

		// The command queue should now abort the ongoing transaction
		// » [REQ] [SendDataAbort]
		expect(serialport.lastWrite).toEqual(Buffer.from("01030016ea", "hex"));
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
		expect(serialport.lastWrite).toEqual(ACK);

		// Abort was acknowledged, Ping for 10 should be failed
		await wait(50);
		await expect(pingPromise10).resolves.toBe(false);

		// Now the Ping for 17 should go out
		// » [Node 017] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:      4
		//   └─[NoOperationCC]
		expect(serialport.lastWrite).toEqual(
			Buffer.from("010800131101002504d5", "hex"),
		);
		serialport.receiveData(ACK);

		await wait(50);

		// Ping 17 does not get resolved by the other callback
		await expect(Promise.race([pingPromise17, wait(50)])).resolves.toBe(
			undefined,
		);

		// « [RES] [SendData]
		//     was sent: true
		serialport.receiveData(Buffer.from("0104011301e8", "hex"));
		// » [ACK]
		expect(serialport.lastWrite).toEqual(ACK);

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
		expect(serialport.lastWrite).toEqual(ACK);
		await expect(pingPromise17).resolves.toBeFalse();

		driver.driverLog.sendQueue(driver["sendThread"].state.context.queue);
	}, 5000);
});
