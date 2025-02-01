import { createDefaultTransportFormat } from "@zwave-js/core/bindings/log/node";
import { SpyTransport, assertMessage } from "@zwave-js/core/test";
import { FunctionType } from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";
import {
	getDefaultMockControllerCapabilities,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

const spyTransport = new SpyTransport();
spyTransport.format = createDefaultTransportFormat(true, true);

integrationTest(
	"when an invalid CC is received, this is printed in the logs",
	{
		// debug: true,

		// No support for Bridge API:
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
			logConfig: {
				enabled: true,
				logToFile: false,
				transports: [spyTransport],
				level: "verbose",
			},
		},

		async testBody(t, driver, node, mockController, mockNode) {
			spyTransport.spy.resetHistory();

			await mockController.sendToHost(
				Bytes.from("010800040021043003e5", "hex"),
			);

			await wait(100);
			assertMessage(t.expect, spyTransport, {
				callNumber: 1,
				message: `« [Node 033] [REQ] [ApplicationCommand]
  └─[BinarySensorCCReport] [INVALID]`,
			});
		},
	},
);
