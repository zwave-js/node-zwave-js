import {
	BinarySwitchCCSet,
	MultiChannelCCCommandEncapsulation,
} from "@zwave-js/cc";
import { MockZWaveFrameType } from "@zwave-js/testing";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"When CC versions are unknown, commands are sent using the highest implemented CC version",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/multiChannelUnknownVersions",
		),

		testBody: async (driver, node, mockController, mockNode) => {
			await node
				.getEndpoint(1)!
				.commandClasses["Binary Switch"].set(true);

			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof
						MultiChannelCCCommandEncapsulation &&
					frame.payload.encapsulated instanceof BinarySwitchCCSet,
			);
		},
	},
);
