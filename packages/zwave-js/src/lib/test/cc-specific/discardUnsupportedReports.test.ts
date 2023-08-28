import {
	type CommandClass,
	MeterCCReport,
	MeterCCValues,
	MultiChannelCCCommandEncapsulation,
	MultilevelSensorCCReport,
	MultilevelSensorCCValues,
	RateType,
} from "@zwave-js/cc";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Discard Multilevel Sensor and Meter CC Reports on nodes and/or endpoints that do not support them",
	{
		debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/discardUnsupportedReports",
		),

		testBody: async (t, driver, node, mockController, mockNode) => {
			// Unsupported report from root endpoint
			let cc: CommandClass = new MultilevelSensorCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: 0x01, // Temperature
				scale: 0x00, // Celsius
				value: 1.001,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// Report from endpoint 1, unsupported on root
			cc = new MultilevelSensorCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: 0x01, // Temperature
				scale: 0x00, // Celsius
				value: 25.12,
			});
			cc = new MultiChannelCCCommandEncapsulation(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				endpoint: 1,
				destination: 0,
				encapsulated: cc,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// Unsupported Report from endpoint 1, supported on root
			cc = new MeterCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: 0x01, // Electric
				scale: 0x00, // kWh
				value: 1.234,
			});
			cc = new MultiChannelCCCommandEncapsulation(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				endpoint: 1,
				destination: 0,
				encapsulated: cc,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			// Supported report from root endpoint
			cc = new MeterCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				type: 0x01, // Electric
				scale: 0x00, // kWh
				value: 2.34,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);

			await wait(100);

			const sensorValue = MultilevelSensorCCValues.value(
				"Air temperature",
			);
			const temperature0 = node.getValue(
				sensorValue.id,
			);
			t.is(temperature0, undefined);

			const temperature1 = node.getValue(sensorValue.endpoint(1));
			t.is(temperature1, 25.12);

			const meterValue = MeterCCValues.value(
				0x01,
				RateType.Unspecified,
				0x00,
			);
			const meter0 = node.getValue(meterValue.id);
			t.is(meter0, 2.34);

			const meter1 = node.getValue(meterValue.endpoint(1));
			t.is(meter1, undefined);
		},
	},
);
