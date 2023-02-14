import {
	BinarySwitchCCReport,
	BinarySwitchCCValues,
} from "@zwave-js/cc/BinarySwitchCC";
import { createMockZWaveRequestFrame } from "@zwave-js/testing";

import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"receiving a BinarySwitchCC::Report with undefined targetValue should not delete the actual targetValue",
	{
		// debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/binarySwitchCC"),

		testBody: async (t, driver, node, mockController, mockNode) => {
			const targetValueValueID = BinarySwitchCCValues.targetValue.id;
			node.valueDB.setValue(targetValueValueID, false);

			const cc = new BinarySwitchCCReport(mockNode.host, {
				nodeId: mockController.host.ownNodeId,
				currentValue: true,
			});
			await mockNode.sendToController(
				createMockZWaveRequestFrame(cc, {
					ackRequested: false,
				}),
			);
			// wait a bit for the value to be updated
			await wait(100);

			// The value in the DB should not be changed because we have no new info
			t.is(node.getValue(targetValueValueID), false);
		},
	},
);
