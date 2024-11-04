import {
	MultiCommandCC,
	SceneActivationCCSet,
	SceneActivationCCValues,
	ZWavePlusCCGet,
	ZWavePlusCCReport,
} from "@zwave-js/cc";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest("All CCs contained in a Multi Command CC are handled", {
	// debug: true,
	provisioningDirectory: path.join(
		__dirname,
		"fixtures/handleMultiCommandPayload",
	),

	// nodeCapabilities: {
	// 	commandClasses: [
	// 		{
	// 			ccId: CommandClasses["Z-Wave Plus Info"],
	// 			isSupported: true,
	// 			version: 2,
	// 		},
	// 	],
	// },

	testBody: async (t, driver, node, mockController, mockNode) => {
		// This one requires a response
		const zwpRequest = new ZWavePlusCCGet({
			nodeId: mockController.ownNodeId,
		});
		// This one updates a value
		const scaSet = new SceneActivationCCSet({
			nodeId: mockController.ownNodeId,
			sceneId: 7,
		});
		const cc = MultiCommandCC.encapsulate([
			zwpRequest,
			scaSet,
		]);
		await mockNode.sendToController(createMockZWaveRequestFrame(cc));

		const expectResponse = mockNode.expectControllerFrame(
			1000,
			(msg): msg is any =>
				msg.type === MockZWaveFrameType.Request
				&& msg.payload instanceof ZWavePlusCCReport,
		);

		const scaValue = SceneActivationCCValues.sceneId;
		const valueNotification = new Promise((resolve) => {
			node.on("value notification", (node, args) => {
				if (scaValue.is(args)) {
					resolve(args.value);
				}
			});
		});
		const expectNotification = valueNotification.then((val) =>
			t.expect(val).toBe(7)
		);

		await Promise.all([expectResponse, expectNotification]);
	},
});
