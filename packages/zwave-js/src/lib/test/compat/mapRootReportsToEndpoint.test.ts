import {
	BinarySwitchCCReport,
	BinarySwitchCCValues,
	type CommandClass,
	MultiChannelCC,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { ccCaps, createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest(
	"The compat flag mapRootReportsToEndpoint works correctly",
	{
		// debug: true,

		nodeCapabilities: {
			// Fibaro FGS221 uses the flag
			manufacturerId: 0x010f,
			productType: 0x0200,
			productId: 0x0102,

			commandClasses: [
				CommandClasses.Version,
				{
					ccId: CommandClasses["Multi Channel"],
					version: 2,
				},
				CommandClasses["Manufacturer Specific"],
				CommandClasses["Binary Switch"],
			],

			endpoints: [
				{
					commandClasses: [
						ccCaps({
							ccId: CommandClasses["Binary Switch"],
							isSupported: true,
							defaultValue: false,
						}),
					],
				},
				{
					commandClasses: [
						ccCaps({
							ccId: CommandClasses["Binary Switch"],
							isSupported: true,
							defaultValue: false,
						}),
					],
				},
			],
		},

		async testBody(t, driver, node, mockController, mockNode) {
			// Send a report from endpoint 2. It should end up on endpoint 2.
			let cc: CommandClass = new BinarySwitchCCReport({
				nodeId: 2,
				currentValue: true,
			});
			cc = MultiChannelCC.encapsulate(cc);
			cc.endpointIndex = 2;

			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, { ackRequested: false }),
			);

			await wait(100);

			t.expect(
				node.getValue(BinarySwitchCCValues.currentValue.endpoint(2)),
			).toBe(true);

			// Send another one from the root. It should end up on endpoint 1.
			cc = new BinarySwitchCCReport({
				nodeId: 2,
				currentValue: true,
			});

			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, { ackRequested: false }),
			);

			await wait(100);

			t.expect(
				node.getValue(BinarySwitchCCValues.currentValue.endpoint(1)),
			).toBe(true);
		},
	},
);
