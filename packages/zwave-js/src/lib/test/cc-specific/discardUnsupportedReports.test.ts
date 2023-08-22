import {
	BinarySensorCCReport,
	BinarySensorCCValues,
	BinarySensorType,
	type CommandClass,
	MultilevelSensorCCReport,
	MultilevelSensorCCValues,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Discard Multilevel Sensor CC on nodes that do not support them",
	{
		// debug: true,
		// provisioningDirectory: path.join(__dirname, "fixtures/configurationCC"),

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Binary Sensor"],
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			let cc: CommandClass = new MultilevelSensorCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: 0x01, // Temperature
				scale: 0x00, // Celsius
				value: 25.12,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			cc = new BinarySensorCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: BinarySensorType.CO2,
				value: true,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			await wait(100);

			const temperature = node.getValue(
				MultilevelSensorCCValues.value("Air temperature").id,
			);
			t.is(temperature, undefined);

			const co2 = node.getValue(
				BinarySensorCCValues.state(BinarySensorType.CO2).id,
			);
			t.is(co2, true);
		},
	},
);
