import { BatteryCCReport, BatteryCCValues } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

// Repro for https://github.com/zwave-js/zwave-js/issues/5252
// Here, a Battery report is received before the node's CC version is known
// This caused the version implemented in Z-Wave JS to be used for creating
// values, which includes some the device does not actually support

integrationTest("CC values are created using the known CC version", {
	// debug: true,

	provisioningDirectory: path.join(
		__dirname,
		"fixtures/ccValuesUnknownVersions",
	),

	testBody: async (t, driver, node, mockController, mockNode) => {
		const batteryReport = new BatteryCCReport({
			nodeId: mockController.ownNodeId,
			isLow: true,
		});
		await mockNode.sendToController(
			createMockZWaveRequestFrame(batteryReport),
		);

		const updatedMetadata: (string | number)[] = [];
		node.on("metadata updated", (node, args) => {
			updatedMetadata.push(args.property);
		});

		await wait(100);

		const levelValue = BatteryCCValues.level;
		const isLowValue = BatteryCCValues.isLow;

		// The level value should be defined because it is included in the report
		// The overheating value shouldn't, since the interview is not complete
		t.expect(updatedMetadata).to.have.members([
			levelValue.id.property,
			isLowValue.id.property,
		]);

		// Also the correct metadata should be returned dynamically
		const definedProperties = node
			.getDefinedValueIDs()
			.filter((id) => id.commandClass === CommandClasses.Battery)
			.map((id) => id.property);
		t.expect(definedProperties).to.have.members([
			levelValue.id.property,
			isLowValue.id.property,
		]);

		t.expect(node.getValue(levelValue.id)).toBe(0);
	},
});
