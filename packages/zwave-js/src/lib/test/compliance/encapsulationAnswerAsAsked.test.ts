import {
	BasicCCReport,
	CRC16CC,
	CRC16CCCommandEncapsulation,
	MultiChannelCC,
	MultiChannelCCCommandEncapsulation,
	SupervisionCC,
	SupervisionCCReport,
	ZWavePlusCCGet,
	ZWavePlusCCReport,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import {
	MockZWaveFrameType,
	type MockZWaveRequestFrame,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"Responses to encapsulated requests use the same encapsulation (CRC-16)",
	{
		// debug: true,
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

		testBody: async (t, driver, node, mockController, mockNode) => {
			// We know that the driver must respond to Z-Wave Plus Info Get
			// so we can use that to test
			const zwpRequest = new ZWavePlusCCGet({
				nodeId: mockController.ownNodeId,
			});
			const cc = CRC16CC.encapsulate(zwpRequest);
			await mockNode.sendToController(createMockZWaveRequestFrame(cc));

			const { payload: response } = await mockNode.expectControllerFrame(
				1000,
				(msg) => msg.type === MockZWaveFrameType.Request,
			);

			t.expect(response instanceof CRC16CCCommandEncapsulation).toBe(
				true,
			);
			t.expect(
				(response as CRC16CCCommandEncapsulation)
					.encapsulated instanceof ZWavePlusCCReport,
			).toBe(true);
		},
	},
);

integrationTest(
	"Responses to encapsulated requests use the same encapsulation (Multi Channel)",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/encapsulationAnswerAsAsked",
		),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses["Multi Channel"],
					version: 4,
					isSupported: true,
				},
				{
					ccId: CommandClasses["Z-Wave Plus Info"],
					isSupported: true,
					version: 2,
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// We know that the driver must respond to Z-Wave Plus Info Get
			// so we can use that to test
			const zwpRequest = new ZWavePlusCCGet({
				nodeId: mockController.ownNodeId,
			});
			const cc = MultiChannelCC.encapsulate(zwpRequest);
			cc.endpointIndex = 2;

			await mockNode.sendToController(createMockZWaveRequestFrame(cc));

			const { payload: response } = await mockNode.expectControllerFrame<
				MockZWaveRequestFrame
			>(
				1000,
				(msg): msg is MockZWaveRequestFrame =>
					msg.type === MockZWaveFrameType.Request,
			);

			t.expect(response instanceof MultiChannelCCCommandEncapsulation)
				.toBe(true);
			const mcc = response as MultiChannelCCCommandEncapsulation;
			t.expect(mcc.destination).toBe(2);
			const inner = mcc.encapsulated;
			t.expect(inner instanceof ZWavePlusCCReport).toBe(true);
		},
	},
);

integrationTest(
	"Responses to encapsulated requests use the same encapsulation (Supervision)",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/encapsulationAnswerAsAsked",
		),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses.Supervision,
					version: 2,
					isSupported: true,
				},
				{
					ccId: CommandClasses["Z-Wave Plus Info"],
					isSupported: true,
					version: 2,
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const basicReport = new BasicCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: 0,
			});
			const cc = SupervisionCC.encapsulate(
				basicReport,
				driver.getNextSupervisionSessionId(mockNode.id),
			);

			await mockNode.sendToController(createMockZWaveRequestFrame(cc));

			const { payload: response } = await mockNode.expectControllerFrame<
				MockZWaveRequestFrame
			>(
				1000,
				(msg): msg is MockZWaveRequestFrame =>
					msg.type === MockZWaveFrameType.Request,
			);

			t.expect(response instanceof SupervisionCCReport).toBe(true);
		},
	},
);

integrationTest(
	"Responses to encapsulated requests use the same encapsulation (Supervision + Multi Channel)",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/encapsulationAnswerAsAsked",
		),

		nodeCapabilities: {
			commandClasses: [
				{
					ccId: CommandClasses["Multi Channel"],
					version: 4,
					isSupported: true,
				},
				{
					ccId: CommandClasses.Supervision,
					version: 2,
					isSupported: true,
				},
				{
					ccId: CommandClasses["Z-Wave Plus Info"],
					isSupported: true,
					version: 2,
				},
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const basicReport = new BasicCCReport({
				nodeId: mockController.ownNodeId,
				currentValue: 0,
			});
			const supervised = SupervisionCC.encapsulate(
				basicReport,
				driver.getNextSupervisionSessionId(mockNode.id),
			);
			const cc = MultiChannelCC.encapsulate(supervised);
			cc.endpointIndex = 2;

			await mockNode.sendToController(createMockZWaveRequestFrame(cc));

			const { payload: response } = await mockNode.expectControllerFrame<
				MockZWaveRequestFrame
			>(
				1000,
				(msg): msg is MockZWaveRequestFrame =>
					msg.type === MockZWaveFrameType.Request,
			);

			t.expect(response instanceof MultiChannelCCCommandEncapsulation)
				.toBe(true);
			const mcc = response as MultiChannelCCCommandEncapsulation;
			t.expect(mcc.destination).toBe(2);
			const inner = mcc.encapsulated;
			t.expect(inner instanceof SupervisionCCReport).toBe(true);
		},
	},
);
