import { FunctionType } from "@zwave-js/serial";
import {
	getDefaultMockControllerCapabilities,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"when a SendData request fails, the `sendMessage/sendCommand` call should be rejected",
	{
		// debug: true,

		controllerCapabilities: {
			...getDefaultMockControllerCapabilities(),
			supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
				(ft) =>
					ft !== FunctionType.SendDataBridge
					&& ft !== FunctionType.SendDataMulticastBridge,
			),
		},

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			mockNode.autoAckControllerFrames = false;

			const basicSetPromise = node.commandClasses.Basic.withOptions({
				maxSendAttempts: 1,
			}).set(99);

			await t.expect(basicSetPromise).rejects.toThrowError();
		},
	},
);

integrationTest(
	"when a SendDataBridge request fails, the `sendMessage/sendCommand` call should be rejected",
	{
		// debug: true,

		controllerCapabilities: {
			...getDefaultMockControllerCapabilities(),
			supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
				(ft) =>
					ft !== FunctionType.SendData
					&& ft !== FunctionType.SendDataMulticast,
			),
		},

		additionalDriverOptions: {
			testingHooks: {
				skipNodeInterview: true,
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			mockNode.autoAckControllerFrames = false;

			const basicSetPromise = node.commandClasses.Basic.withOptions({
				maxSendAttempts: 1,
			}).set(99);

			await t.expect(basicSetPromise).rejects.toThrowError();
		},
	},
);
