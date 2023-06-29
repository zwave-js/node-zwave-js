import {
	ZWavePlusCCGet,
	ZWavePlusCCReport,
	ZWavePlusRoleType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
	type MockZWaveRequestFrame,
} from "@zwave-js/testing";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest("Response to Z-Wave Plus Info Get", {
	// debug: true,
	provisioningDirectory: path.join(__dirname, "fixtures/base_2_nodes"),

	nodeCapabilities: {
		commandClasses: [
			{
				ccId: CommandClasses["Z-Wave Plus Info"],
				isSupported: true,
				version: 2,
			},
		],
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		const zwpRequest = new ZWavePlusCCGet(mockController.host, {
			nodeId: mockNode.id,
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(zwpRequest),
		);

		const { payload: response } = await mockNode.expectControllerFrame(
			1000,
			(
				msg,
			): msg is MockZWaveRequestFrame & {
				payload: ZWavePlusCCReport;
			} =>
				msg.type === MockZWaveFrameType.Request &&
				msg.payload instanceof ZWavePlusCCReport,
		);

		// Z-Wave+ v2 specifications, section 3.1
		t.is(response.zwavePlusVersion, 2);
		// Z-Wave+ v2 specifications, section 4.1
		t.is(response.roleType, ZWavePlusRoleType.CentralStaticController);
	},
});
