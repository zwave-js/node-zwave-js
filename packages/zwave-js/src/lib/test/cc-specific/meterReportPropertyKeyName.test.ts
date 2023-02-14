// repro from https://github.com/zwave-js/zwave-js-ui/issues/101#issuecomment-749007701

import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"When receiving a MeterCC::Report, the value event should contain the meter name in propertyKeyName",
	{
		// debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/configurationCC"),

		testBody: async (t, driver, node, mockController, _mockNode) => {
			const valueAddedPromise = new Promise<void>((resolve) => {
				node.on("value added", (_node, args) => {
					t.is(args.propertyKeyName, "Electric_kWh_Consumed");
					resolve();
				});
			});

			// TODO: this is not nice, we should send an actual CC instance
			// from the node instead
			await Promise.all([
				valueAddedPromise,
				mockController.sendToHost(
					Buffer.from(
						"0116000400020e3202214400013707012d00013707d5004d",
						"hex",
					),
				),
			]);
		},
	},
);
