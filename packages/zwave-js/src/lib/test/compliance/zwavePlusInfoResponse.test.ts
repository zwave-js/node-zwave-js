import {
	ZWavePlusCCGet,
	ZWavePlusCCReport,
	ZWavePlusRoleType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockZWaveFrameType,
	MockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
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

	testBody: async (driver, node, mockController, mockNode) => {
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
		expect(response.zwavePlusVersion).toBe(2);
		// Z-Wave+ v2 specifications, section 4.1
		expect(response.roleType).toBe(
			ZWavePlusRoleType.CentralStaticController,
		);

		// Allow for everything to settle
		await wait(100);
	},
});
