import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

integrationTest("Fibaro FGR222 should support the Fibaro CC", {
	// debug: true,
	provisioningDirectory: path.join(__dirname, "fixtures/Fibaro"),

	testBody: async (t, driver, node, _mockController, _mockNode) => {
		const CCs = (node.deviceConfig?.proprietary?.fibaroCCs
			?? []) as number[];
		t.expect(CCs.includes(0x26)).toBe(true);
	},
});
