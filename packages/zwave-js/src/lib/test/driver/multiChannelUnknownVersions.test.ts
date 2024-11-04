import {
	BinarySwitchCCSet,
	MultiChannelCCCommandEncapsulation,
} from "@zwave-js/cc";
import { MockZWaveFrameType } from "@zwave-js/testing";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"When CC versions are unknown, commands are sent using the highest implemented CC version",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/multiChannelUnknownVersions",
		),

		testBody: async (t, driver, node, mockController, mockNode) => {
			await node
				.getEndpoint(1)!
				.commandClasses["Binary Switch"].set(true);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload
						instanceof MultiChannelCCCommandEncapsulation
					&& frame.payload.encapsulated instanceof BinarySwitchCCSet,
			);
		},
	},
);
