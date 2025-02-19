import { BasicCCSet, BasicCCValues } from "@zwave-js/cc/BasicCC";
import { FunctionType, SendDataResponse } from "@zwave-js/serial";
import {
	type MockControllerBehavior,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"unsolicited commands which need special handling are passed to Node.handleCommand",
	{
		// Repro from #4467

		// debug: true,

		additionalDriverOptions: {
			testingHooks: {
				skipFirmwareIdentification: true,
				skipNodeInterview: true,
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const value = BasicCCValues.currentValue;
			t.expect(node.getValue(value.id)).toBeUndefined();

			const cc = new BasicCCSet({
				nodeId: node.id,
				targetValue: 5,
			});
			mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			await new Promise<void>((resolve) => {
				node.on("value added", (node, args) => {
					if (value.is(args) && args.newValue === 5) resolve();
				});
			});
		},
	},
);

integrationTest(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller response",
	{
		// Repro from #4467

		// debug: true,

		additionalDriverOptions: {
			testingHooks: {
				skipFirmwareIdentification: true,
				skipNodeInterview: true,
			},
		},

		async customSetup(driver, mockController, mockNode) {
			const noSendDataResponse: MockControllerBehavior = {
				onHostMessage(controller, msg) {
					if (msg.functionType === FunctionType.SendData) {
						// Ignore
						return true;
					}
				},
			};
			mockController.defineBehavior(noSendDataResponse);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const value = BasicCCValues.currentValue;
			t.expect(node.getValue(value.id)).toBeUndefined();

			node.ping();

			const cc = new BasicCCSet({
				nodeId: node.id,
				targetValue: 5,
			});
			mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			await new Promise<void>((resolve) => {
				node.on("value added", (node, args) => {
					if (value.is(args) && args.newValue === 5) resolve();
				});
			});
		},
	},
);

integrationTest(
	"unsolicited commands are passed to Node.handleCommand while waiting for a controller callback",
	{
		// Repro from #4467

		// debug: true,

		additionalDriverOptions: {
			testingHooks: {
				skipFirmwareIdentification: true,
				skipNodeInterview: true,
			},
		},

		async customSetup(driver, mockController, mockNode) {
			const noSendDataResponse: MockControllerBehavior = {
				async onHostMessage(controller, msg) {
					if (msg.functionType === FunctionType.SendData) {
						// Notify the host that the message was sent

						const res = new SendDataResponse({
							wasSent: true,
						});
						await controller.sendMessageToHost(res);

						// But do not send a callback
						return true;
					}
				},
			};
			mockController.defineBehavior(noSendDataResponse);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const value = BasicCCValues.currentValue;
			t.expect(node.getValue(value.id)).toBeUndefined();

			node.ping();

			await wait(50);

			const cc = new BasicCCSet({
				nodeId: node.id,
				targetValue: 5,
			});
			mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			await new Promise<void>((resolve) => {
				node.on("value added", (node, args) => {
					if (value.is(args) && args.newValue === 5) resolve();
				});
			});
		},
	},
);
