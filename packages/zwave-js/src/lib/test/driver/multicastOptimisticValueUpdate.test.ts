import { BinarySwitchCCSet, BinarySwitchCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuiteMulti";

// Regression test for #5844

integrationTest("multicast setValue: do optimistic value update after ACK", {
	debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	nodeCapabilities: [
		{
			id: 2,
			capabilities: {
				commandClasses: [CommandClasses["Binary Switch"]],
			},
		},
		{
			id: 3,
			capabilities: {
				commandClasses: [CommandClasses["Binary Switch"]],
			},
		},
	],

	testBody: async (t, driver, nodes, mockController, mockNodes) => {
		const [node2, node3] = nodes;

		t.is(node2.getValue(BinarySwitchCCValues.targetValue.id), undefined);
		t.is(node3.getValue(BinarySwitchCCValues.targetValue.id), undefined);
		t.is(node2.getValue(BinarySwitchCCValues.currentValue.id), undefined);
		t.is(node3.getValue(BinarySwitchCCValues.currentValue.id), undefined);

		const mcGroup = driver.controller.getMulticastGroup([2, 3]);

		await mcGroup.setValue(BinarySwitchCCValues.targetValue.id, true);

		for (const mockNode of mockNodes) {
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request &&
					frame.payload instanceof BinarySwitchCCSet,
				{
					errorMessage: `Node ${mockNode.id} should have received a BinarySwitchCCSet`,
				},
			);
		}

		await wait(100);

		t.is(node2.getValue(BinarySwitchCCValues.currentValue.id), true);
		t.is(node3.getValue(BinarySwitchCCValues.currentValue.id), true);
	},
});
