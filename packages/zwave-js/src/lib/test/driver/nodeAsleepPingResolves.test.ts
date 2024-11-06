import { NodeStatus } from "@zwave-js/core";
import { wait } from "alcalzone-shared/async";
import path from "node:path";
import { integrationTest } from "../integrationTestSuite.js";

// Repro from #6062

integrationTest(
	"when a node does not respond because it is asleep, pings should resolve",
	{
		// debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/nodeAsleepNoReject",
		),

		testBody: async (t, driver, node2, mockController, mockNode) => {
			mockNode.autoAckControllerFrames = false;

			t.expect(node2.status).toBe(NodeStatus.Asleep);
			const pingResult = await Promise.race([
				node2.ping(),
				wait(2000).then(() => "timeout"),
			]);
			t.expect(pingResult).toBe(false);
		},
	},
);
