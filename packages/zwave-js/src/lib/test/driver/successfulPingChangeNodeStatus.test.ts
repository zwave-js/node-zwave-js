import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import {
	createThrowingMap,
	getEnumMemberName,
	ThrowingMap,
} from "@zwave-js/shared";
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
	t.timeout(5000);

	const { driver, serialport } = await createAndStartDriver();

	driver["_controller"] = {
		ownNodeId: 1,
		isFunctionSupported: isFunctionSupported_NoBridge,
		nodes: createThrowingMap(),
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

for (const initialStatus of [
	NodeStatus.Unknown,
	NodeStatus.Asleep,
	NodeStatus.Dead,
]) {
	for (const canSleep of [true, false]) {
		// Exclude tests that make no sense
		if (
			(initialStatus === NodeStatus.Asleep && !canSleep) ||
			(canSleep && initialStatus === NodeStatus.Dead)
		) {
			continue;
		}

		const expectedStatus = canSleep ? NodeStatus.Awake : NodeStatus.Alive;

		test.serial(
			`When a ping succeeds, the node should be marked awake/alive (Can sleep: ${canSleep}, initial status: ${getEnumMemberName(
				NodeStatus,
				initialStatus,
			)})`,
			async (t) => {
				const { driver, serialport } = t.context;

				// https://github.com/zwave-js/node-zwave-js/issues/1364#issuecomment-760006591

				const node4 = new ZWaveNode(4, driver);
				(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
					node4.id,
					node4,
				);
				// Add event handlers for the nodes
				for (const node of driver.controller.nodes.values()) {
					driver["addNodeEventHandlers"](node);
				}

				if (canSleep) {
					node4["isListening"] = false;
					node4["isFrequentListening"] = false;
				} else {
					node4["isListening"] = true;
					node4["isFrequentListening"] = false;
				}

				if (initialStatus === NodeStatus.Asleep) {
					node4.markAsAsleep();
				} else if (initialStatus === NodeStatus.Dead) {
					node4.markAsDead();
				}
				t.is(node4.status, initialStatus);

				const ACK = Buffer.from([MessageHeaders.ACK]);

				const pingPromise = node4.ping();
				await wait(1);
				// » [Node 004] [REQ] [SendData]
				//   │ transmit options: 0x25
				//   │ callback id:      1
				//   └─[NoOperationCC]
				t.deepEqual(
					serialport.lastWrite,
					Buffer.from("010800130401002501c5", "hex"),
				);
				await wait(10);
				serialport.receiveData(ACK);

				await wait(10);

				// « [RES] [SendData]
				//     was sent: true
				serialport.receiveData(Buffer.from("0104011301e8", "hex"));
				// » [ACK]
				t.deepEqual(serialport.lastWrite, ACK);

				await wait(10);

				// « [REQ] [SendData]
				//     callback id:     1
				//     transmit status: OK
				serialport.receiveData(
					Buffer.from(
						"011800130100000100bd7f7f7f7f010103000000000201000049",
						"hex",
					),
				);
				t.deepEqual(serialport.lastWrite, ACK);

				await wait(10);

				await pingPromise;

				t.is(node4.status, expectedStatus);
			},
		);
	}
}
