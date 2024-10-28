import { NodeStatus } from "@zwave-js/core";
import path from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { integrationTest } from "../integrationTestSuite";

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

			t.is(node2.status, NodeStatus.Asleep);
			const pingResult = await Promise.race([
				node2.ping(),
				wait(2000, "timeout"),
			]);
			t.is(pingResult, false);
		},
	},
);
