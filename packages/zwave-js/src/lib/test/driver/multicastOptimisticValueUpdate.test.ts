import { BinarySwitchCCSet, BinarySwitchCCValues } from "@zwave-js/cc";
import { CommandClasses, NOT_KNOWN, UNKNOWN_STATE } from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import {
	type MockControllerCapabilities,
	MockZWaveFrameType,
	ccCaps,
	getDefaultMockControllerCapabilities,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuiteMulti.js";

// Regression test for #5844

const controllerCapabilitiesNoBridge: MockControllerCapabilities = {
	// No support for Bridge API:
	...getDefaultMockControllerCapabilities(),
	supportedFunctionTypes: getDefaultSupportedFunctionTypes().filter(
		(ft) =>
			ft !== FunctionType.SendDataBridge
			&& ft !== FunctionType.SendDataMulticastBridge,
	),
};

integrationTest("multicast setValue: do optimistic value update after ACK", {
	// debug: true,
	// provisioningDirectory: path.join(
	// 	__dirname,
	// 	"__fixtures/supervision_binary_switch",
	// ),

	controllerCapabilities: controllerCapabilitiesNoBridge,

	nodeCapabilities: [
		{
			id: 2,
			capabilities: {
				commandClasses: [
					ccCaps({
						ccId: CommandClasses["Binary Switch"],
						isSupported: true,
						defaultValue: NOT_KNOWN,
					}),
				],
			},
		},
		{
			id: 3,
			capabilities: {
				commandClasses: [
					ccCaps({
						ccId: CommandClasses["Binary Switch"],
						isSupported: true,
						defaultValue: NOT_KNOWN,
					}),
				],
			},
		},
	],

	testBody: async (t, driver, nodes, mockController, mockNodes) => {
		const [node2, node3] = nodes;

		t.expect(node2.getValue(BinarySwitchCCValues.targetValue.id)).toBe(
			NOT_KNOWN,
		);
		t.expect(node3.getValue(BinarySwitchCCValues.targetValue.id)).toBe(
			NOT_KNOWN,
		);
		t.expect(
			node2.getValue(BinarySwitchCCValues.currentValue.id),
		).toBe(UNKNOWN_STATE);
		t.expect(
			node3.getValue(BinarySwitchCCValues.currentValue.id),
		).toBe(UNKNOWN_STATE);

		const mcGroup = driver.controller.getMulticastGroup([2, 3]);

		await mcGroup.setValue(BinarySwitchCCValues.targetValue.id, true);

		for (const mockNode of mockNodes) {
			mockNode.assertReceivedControllerFrame(
				(frame) =>
					frame.type === MockZWaveFrameType.Request
					&& frame.payload instanceof BinarySwitchCCSet,
				{
					errorMessage:
						`Node ${mockNode.id} should have received a BinarySwitchCCSet`,
				},
			);
		}

		await wait(100);

		t.expect(node2.getValue(BinarySwitchCCValues.currentValue.id)).toBe(
			true,
		);
		t.expect(node3.getValue(BinarySwitchCCValues.currentValue.id)).toBe(
			true,
		);
	},
});
