import { MessageHeaders } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import {
	Bytes,
	type ThrowingMap,
	createThrowingMap,
	getEnumMemberName,
} from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async/index.js";
import { afterEach, beforeEach, test } from "vitest";
import type { Driver } from "../../driver/Driver.js";
import { ZWaveNode } from "../../node/Node.js";
import { NodeStatus } from "../../node/_Types.js";
import { createAndStartDriver } from "../utils.js";
import { isFunctionSupported_NoBridge } from "./fixtures.js";

interface TestContext {
	driver: Driver;
	serialport: MockSerialPort;
}

const test = ava as TestFn<TestContext>;

beforeEach(async (t) => {
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

afterEach(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

process.env.LOGLEVEL = "debug";

for (
	const initialStatus of [
		NodeStatus.Unknown,
		NodeStatus.Asleep,
		NodeStatus.Dead,
	]
) {
	for (const canSleep of [true, false]) {
		// Exclude tests that make no sense
		if (
			(initialStatus === NodeStatus.Asleep && !canSleep)
			|| (canSleep && initialStatus === NodeStatus.Dead)
		) {
			continue;
		}

		const expectedStatus = canSleep ? NodeStatus.Awake : NodeStatus.Alive;

		test.sequential(
			`When a ping succeeds, the node should be marked awake/alive (Can sleep: ${canSleep}, initial status: ${
				getEnumMemberName(
					NodeStatus,
					initialStatus,
				)
			})`,
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
				t.expect(node4.status).toBe(initialStatus);

				const ACK = Uint8Array.from([MessageHeaders.ACK]);

				const pingPromise = node4.ping();
				await wait(1);
				// » [Node 004] [REQ] [SendData]
				//   │ transmit options: 0x25
				//   │ callback id:      1
				//   └─[NoOperationCC]
				t.expect(
					serialport.lastWrite,
				).toStrictEqual(Bytes.from("010800130401002501c5", "hex"));
				await wait(10);
				serialport.receiveData(ACK);

				await wait(10);

				// « [RES] [SendData]
				//     was sent: true
				serialport.receiveData(Bytes.from("0104011301e8", "hex"));
				// » [ACK]
				t.expect(serialport.lastWrite).toStrictEqual(ACK);

				await wait(10);

				// « [REQ] [SendData]
				//     callback id:     1
				//     transmit status: OK
				serialport.receiveData(
					Bytes.from(
						"011800130100000100bd7f7f7f7f010103000000000201000049",
						"hex",
					),
				);
				t.expect(serialport.lastWrite).toStrictEqual(ACK);

				await wait(10);

				await pingPromise;

				t.expect(node4.status).toBe(expectedStatus);
			},
		);
	}
}
