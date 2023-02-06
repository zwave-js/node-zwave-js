import {
	MultiCommandCC,
	SceneActivationCCSet,
	SceneActivationCCValues,
	ZWavePlusCCGet,
	ZWavePlusCCReport,
} from "@zwave-js/cc";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
} from "@zwave-js/testing";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

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

	testBody: async (driver, node, mockController, mockNode) => {
		// This one requires a response
		const zwpRequest = new ZWavePlusCCGet(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
		});
		// This one updates a value
		const scaSet = new SceneActivationCCSet(mockNode.host, {
			nodeId: mockController.host.ownNodeId,
			sceneId: 7,
		});
		const cc = MultiCommandCC.encapsulate(mockNode.host, [
			zwpRequest,
			scaSet,
		]);
		await mockNode.sendToController(createMockZWaveRequestFrame(cc));

		const expectResponse = mockNode.expectControllerFrame(
			1000,
			(msg): msg is any =>
				msg.type === MockZWaveFrameType.Request &&
				msg.payload instanceof ZWavePlusCCReport,
		);

		const scaValue = SceneActivationCCValues.sceneId;
		const valueNotification = new Promise((resolve) => {
			node.on("value notification", (node, args) => {
				if (scaValue.is(args)) {
					resolve(args.value);
				}
			});
		});
		const expectNotification = expect(valueNotification).resolves.toBe(7);

		await Promise.all([expectResponse, expectNotification]);
	},
});
