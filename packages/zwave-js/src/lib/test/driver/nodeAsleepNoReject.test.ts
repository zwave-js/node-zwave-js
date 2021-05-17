import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { wait } from "alcalzone-shared/async";
import { BasicCCSet } from "../../commandclass/BasicCC";
import type { SendDataRequest } from "../../controller/SendDataMessages";
import type { Driver } from "../../driver/Driver";
import { MessagePriority } from "../../message/Constants";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/Types";
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
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("when a node does not respond because it is asleep, the transaction does not get rejected", async () => {
		jest.setTimeout(5000);
		// Repro from #1078

		const node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);
		// Add event handlers for the nodes
		for (const node of driver.controller.nodes.values()) {
			driver["addNodeEventHandlers"](node);
		}

		node2["_isListening"] = false;
		node2["_isFrequentListening"] = false;
		node2.markAsAwake();
		expect(node2.status).toBe(NodeStatus.Awake);

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
		await expect(
			Promise.race([basicSetPromise1, wait(50).then(() => "OK")]),
		).resolves.toBe("OK");

		// Both transactions should still be in the queue
		const sendQueue = driver["sendThread"].state.context.queue;
		expect(sendQueue.length).toBe(2);
		expect(sendQueue.get(0)?.priority).toBe(MessagePriority.WakeUp);
		expect(sendQueue.get(1)?.priority).toBe(MessagePriority.WakeUp);
		expect(node2.status).toBe(NodeStatus.Asleep);

		// And the order should be correct
		expect(
			((sendQueue.get(0)?.message as SendDataRequest)
				.command as BasicCCSet).targetValue,
		).toBe(99);
		expect(
			((sendQueue.get(1)?.message as SendDataRequest)
				.command as BasicCCSet).targetValue,
		).toBe(50);
	});
});
