import { BasicCCReport } from "@zwave-js/cc/BasicCC";
import {
	ConfigurationCCNameGet,
	ConfigurationCCNameReport,
} from "@zwave-js/cc/ConfigurationCC";
import {
	MAX_SEGMENT_SIZE,
	TransportServiceCCFirstSegment,
	TransportServiceCCSubsequentSegment,
} from "@zwave-js/cc/TransportServiceCC";
import { CommandClasses } from "@zwave-js/core";
import {
	type MockNodeBehavior,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"GET requests don't time out early if the response is split using the 'more to follow' flag",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				{
					ccId: CommandClasses.Configuration,
					isSupported: true,
					version: 1,
				},
			],
		},

		async customSetup(driver, mockController, mockNode) {
			const respondToConfigurationNameGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof ConfigurationCCNameGet) {
						await wait(700);
						let cc = new ConfigurationCCNameReport(self.host, {
							nodeId: controller.host.ownNodeId,
							parameter: receivedCC.parameter,
							name: "Test para",
							reportsToFollow: 1,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						await wait(700);

						cc = new ConfigurationCCNameReport(self.host, {
							nodeId: controller.host.ownNodeId,
							parameter: receivedCC.parameter,
							name: "meter",
							reportsToFollow: 0,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);

						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(respondToConfigurationNameGet);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const name = await node.commandClasses.Configuration.getName(1);
			t.is(name, "Test parameter");
		},
	},
);

const longName =
	"Veeeeeeeeeeeeeeeeeeeeeeeeery loooooooooooooooooong parameter name";

integrationTest(
	"GET requests don't time out early if the response is split using Transport Service CC",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				{
					ccId: CommandClasses.Configuration,
					isSupported: true,
					version: 1,
				},
			],
		},

		async customSetup(driver, mockController, mockNode) {
			const respondToConfigurationNameGet: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof ConfigurationCCNameGet) {
						const configCC = new ConfigurationCCNameReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								parameter: receivedCC.parameter,
								name:
									"Veeeeeeeeeeeeeeeeeeeeeeeeery loooooooooooooooooong parameter name",
								reportsToFollow: 0,
							},
						);
						const serialized = configCC.serialize();
						const segment1 = serialized.subarray(
							0,
							MAX_SEGMENT_SIZE,
						);
						const segment2 = serialized.subarray(MAX_SEGMENT_SIZE);

						const sessionId = 7;

						const tsFS = new TransportServiceCCFirstSegment(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								sessionId,
								datagramSize: serialized.length,
								partialDatagram: segment1,
							},
						);
						const tsSS = new TransportServiceCCSubsequentSegment(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								sessionId,
								datagramSize: serialized.length,
								datagramOffset: segment1.length,
								partialDatagram: segment2,
							},
						);

						await wait(700);
						await self.sendToController(
							createMockZWaveRequestFrame(tsFS, {
								ackRequested: false,
							}),
						);

						await wait(700);
						await self.sendToController(
							createMockZWaveRequestFrame(tsSS, {
								ackRequested: false,
							}),
						);
						return { action: "stop" };
					}
				},
			};
			mockNode.defineBehavior(respondToConfigurationNameGet);
		},

		async testBody(t, driver, node, mockController, mockNode) {
			const name = await node.commandClasses.Configuration.getName(1);
			t.is(name, longName);
		},
	},
);

integrationTest("GET requests DO time out if there's no matching response", {
	// debug: true,

	nodeCapabilities: {
		commandClasses: [
			CommandClasses.Version,
			{
				ccId: CommandClasses.Configuration,
				isSupported: true,
				version: 1,
			},
		],
	},

	async customSetup(driver, mockController, mockNode) {
		const respondToConfigurationNameGet: MockNodeBehavior = {
			handleCC(controller, self, receivedCC) {
				if (receivedCC instanceof ConfigurationCCNameGet) {
					// This is not the response you're looking for
					const cc = new BasicCCReport(self.host, {
						nodeId: controller.host.ownNodeId,
						currentValue: 1,
					});
					return { action: "sendCC", cc };
				}
			},
		};
		mockNode.defineBehavior(respondToConfigurationNameGet);
	},

	async testBody(t, driver, node, mockController, mockNode) {
		const name = await node.commandClasses.Configuration.getName(1);
		t.is(name, undefined);
	},
});
