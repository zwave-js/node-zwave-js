import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest("Fibaro FGR222 should support the Fibaro CC", {
	// debug: true,
	provisioningDirectory: path.join(__dirname, "fixtures/Fibaro"),

	testBody: async (t, driver, node, _mockController, _mockNode) => {
		const CCs = (node.deviceConfig?.proprietary?.fibaroCCs ??
			[]) as number[];
		t.true(CCs.includes(0x26));
	},
});
