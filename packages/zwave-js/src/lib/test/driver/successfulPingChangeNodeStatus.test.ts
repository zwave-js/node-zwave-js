import { CommandClasses } from "@zwave-js/core";
import { MessageHeaders, MockSerialPort } from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { NodeStatus } from "../../node/Types";
import { createAndStartDriver } from "../utils";

describe("When a ping succeeds, the node should be marked awake/alive", () => {
	let driver: Driver;
	let serialport: MockSerialPort;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver, serialport } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: () => true,
			nodes: new Map(),
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	for (const initialStatus of [
		NodeStatus.Unknown,
		NodeStatus.Asleep,
		NodeStatus.Dead,
	]) {
		for (const supportsWakeUp of [true, false]) {
			// Exclude tests that make no sense
			if (
				(initialStatus === NodeStatus.Asleep && !supportsWakeUp) ||
				(supportsWakeUp && initialStatus === NodeStatus.Dead)
			) {
				continue;
			}

			const expectedStatus = supportsWakeUp
				? NodeStatus.Awake
				: NodeStatus.Alive;

			it(`Wake Up: ${supportsWakeUp}, initial status: ${getEnumMemberName(
				NodeStatus,
				initialStatus,
			)}`, async () => {
				jest.setTimeout(5000);
				// https://github.com/zwave-js/node-zwave-js/issues/1364#issuecomment-760006591

				const node4 = new ZWaveNode(4, driver);
				(driver.controller.nodes as Map<number, ZWaveNode>).set(
					node4.id,
					node4,
				);
				// Add event handlers for the nodes
				for (const node of driver.controller.nodes.values()) {
					driver["addNodeEventHandlers"](node);
				}

				if (supportsWakeUp) {
					node4.addCC(CommandClasses["Wake Up"], {
						isSupported: true,
					});
				}
				if (initialStatus === NodeStatus.Asleep) {
					node4.markAsAsleep();
				} else if (initialStatus === NodeStatus.Dead) {
					node4.markAsDead();
				}
				expect(node4.status).toBe(initialStatus);

				const ACK = Buffer.from([MessageHeaders.ACK]);

				const pingPromise = node4.ping();
				// » [Node 004] [REQ] [SendData]
				//   │ transmit options: 0x25
				//   │ callback id:      1
				//   └─[NoOperationCC]
				expect(serialport.lastWrite).toEqual(
					Buffer.from("010800130401002501c5", "hex"),
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
						"011800130100000100bd7f7f7f7f010103000000000201000049",
						"hex",
					),
				);
				expect(serialport.lastWrite).toEqual(ACK);

				await wait(10);

				await pingPromise;

				expect(node4.status).toBe(expectedStatus);
			});
		}
	}
});
