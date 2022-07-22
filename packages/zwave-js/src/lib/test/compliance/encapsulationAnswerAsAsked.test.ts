import {
	CRC16CC,
	CRC16CCCommandEncapsulation,
	ZWavePlusCCGet,
	ZWavePlusCCReport,
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

integrationTest(
	"Responses to encapsulated requests use the same encapsulation",
	{
		debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/base_2_nodes"),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses["CRC-16 Encapsulation"],
					isSupported: true,
				},
				{
					ccId: CommandClasses["Z-Wave Plus Info"],
					isSupported: true,
					version: 2,
				},
			],
		},

		testBody: async (driver, node, mockController, mockNode) => {
			// We know that the driver must respond to Z-Wave Plus Info Get
			// so we can use that to test
			const zwpRequest = new ZWavePlusCCGet(mockController.host, {
				nodeId: mockNode.id,
			});
			const cc = CRC16CC.encapsulate(mockController.host, zwpRequest);
			await mockNode.sendToController(createMockZWaveRequestFrame(cc));

			const { payload: response } = await mockNode.expectControllerFrame(
				1000,
				(msg): msg is MockZWaveRequestFrame =>
					msg.type === MockZWaveFrameType.Request,
			);

			expect(response).toBeInstanceOf(CRC16CCCommandEncapsulation);
			expect(
				(response as CRC16CCCommandEncapsulation).encapsulated,
			).toBeInstanceOf(ZWavePlusCCReport);

			// Allow for everything to settle
			await wait(100);
		},
	},
);
