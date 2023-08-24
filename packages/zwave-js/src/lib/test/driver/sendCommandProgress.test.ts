import { BinarySwitchCCValues } from "@zwave-js/cc/BinarySwitchCC";
import { CommandClasses, TransactionState } from "@zwave-js/core";
import sinon from "sinon";

import { getEnumMemberName } from "@zwave-js/shared";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"The progress listener passed to sendCommand gets called with status updates",
	{
		// debug: true,

		nodeCapabilities: {
			commandClasses: [
				CommandClasses.Version,
				CommandClasses["Binary Switch"],
			],
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			const onProgress = sinon.stub().callsFake((progress) => {
				driver.driverLog.print(
					`onProgress: ${
						getEnumMemberName(TransactionState, progress.state)
					}`,
				);
			});

			await node.setValue(BinarySwitchCCValues.targetValue.id, true, {
				onProgress,
			});

			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Queued,
			});

			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Active,
			});
			sinon.assert.calledWith(onProgress, {
				state: TransactionState.Completed,
			});

			t.pass();
		},
	},
);
