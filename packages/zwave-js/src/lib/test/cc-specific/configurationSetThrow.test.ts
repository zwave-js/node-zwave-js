import path from "node:path";
import sinon from "sinon";
import { integrationTest } from "../integrationTestSuite.js";

// repro from https://github.com/zwave-js/zwave-js-ui/issues/101#issuecomment-749007701

integrationTest(
	"trying to send a ConfigurationCC::Set with invalid value should throw immediately",
	{
		// debug: true,
		provisioningDirectory: path.join(__dirname, "fixtures/configurationCC"),

		testBody: async (t, driver, node, _mockController, _mockNode) => {
			const spy = sinon.spy();
			driver.on("error", spy);

			const promise = node.commandClasses.Configuration.setValue!(
				{
					property: 2,
				},
				"not-a-number",
			);

			await t.expect(() => promise).rejects.toThrowError();
			t.expect(spy.callCount).toBe(0);
		},
	},
);
