import { type CommandClass } from "@zwave-js/cc";
import { BasicCCGet, BasicCCReport, BasicCCValues } from "@zwave-js/cc/BasicCC";
import { MultiChannelCCCommandEncapsulation } from "@zwave-js/cc/MultiChannelCC";
import { CommandClasses, NodeStatus } from "@zwave-js/core";
import {
	MOCK_FRAME_ACK_TIMEOUT,
	type MockNodeBehavior,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

// Repro for https://github.com/home-assistant/core/issues/98491

integrationTest(
	"setValue calls resolve on success after the first attempt failed",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				{
					ccId: CommandClasses["Multi Channel"],
					version: 2,
				},
				CommandClasses.Basic,
			],
			endpoints: [{
				commandClasses: [CommandClasses.Basic],
			}, {
				commandClasses: [CommandClasses.Basic],
			}],
		},

		async customSetup(driver, mockController, mockNode) {
			// The default mock implementation does not support endpoints
			const respondToBasicGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof MultiChannelCCCommandEncapsulation
						&& receivedCC.encapsulated instanceof BasicCCGet
					) {
						// Do not respond if BasicCC is not explicitly listed as supported
						if (!self.implementedCCs.has(CommandClasses.Basic)) {
							return { action: "stop" };
						}

						let cc: CommandClass = new BasicCCReport(self.host, {
							nodeId: controller.host.ownNodeId,
							currentValue: Math.round(Math.random() * 99),
						});
						cc = new MultiChannelCCCommandEncapsulation(self.host, {
							nodeId: controller.host.ownNodeId,
							destination: receivedCC.endpointIndex,
							endpoint: receivedCC.destination as number,
							encapsulated: cc,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToBasicGet);
		},

		testBody: async (t, driver, node2, mockController, mockNode) => {
			driver.updateLogConfig({
				level: "silly",
			});

			node2.markAsAlive();
			// @ts-expect-error
			node2._deviceConfig = {
				compat: {
					preserveRootApplicationCCValueIDs: true,
				},
			};

			t.is(node2.status, NodeStatus.Alive);

			const basicSetPromise0 = node2.setValue(
				BasicCCValues.targetValue.endpoint(0),
				0,
			);
			basicSetPromise0.then(() => {
				driver.driverLog.print("basicSetPromise0 resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise0 rejected");
			});

			const basicSetPromise1 = node2.setValue(
				BasicCCValues.targetValue.endpoint(1),
				1,
			);
			basicSetPromise1.then(() => {
				driver.driverLog.print("basicSetPromise1 resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise1 rejected");
			});

			const basicSetPromise2 = node2.setValue(
				BasicCCValues.targetValue.endpoint(2),
				2,
			);
			basicSetPromise2.then(() => {
				driver.driverLog.print("basicSetPromise2 resolved");
			}).catch(() => {
				driver.driverLog.print("basicSetPromise2 rejected");
			});

			// The first and second commands succeeds immediately
			await basicSetPromise0;
			await basicSetPromise1;
			// The 3rd fails initially
			mockNode.autoAckControllerFrames = false;
			// Wait until the command is retried, then ack the frame
			await wait(MOCK_FRAME_ACK_TIMEOUT / 2);
			mockNode.autoAckControllerFrames = true;

			await basicSetPromise2;
			t.is(node2.status, NodeStatus.Alive);

			await wait(10000);
		},
	},
);
