import { VersionCCCommandClassGet } from "@zwave-js/cc";
import { CommandClasses, InterviewStage, SecurityClass } from "@zwave-js/core";
import { type MockNodeBehavior, MockZWaveFrameType } from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";

import { InclusionStrategy } from "../../controller/Inclusion.js";
import type { ZWaveNode } from "../../node/Node.js";
import { integrationTest } from "../integrationTestSuite.js";
import { integrationTest as integrationTestMulti } from "../integrationTestSuiteMulti.js";

integrationTest("an ongoing interview is paused while an inclusion is active", {
	// debug: true,

	nodeCapabilities: {
		isListening: true,
		isFrequentListening: false,
		commandClasses: [
			CommandClasses.Version,
			CommandClasses["Binary Switch"],
			CommandClasses.Basic,
		],
	},

	customSetup: async (driver, mockController, mockNode) => {
		// Delay responses so the interview spans the inclusion window
		const delayResponses: MockNodeBehavior = {
			async handleCC(controller, self, receivedCC) {
				await wait(30);
				// Fall through to the default handlers
				return undefined;
			},
		};
		mockNode.defineBehavior(delayResponses);
	},

	testBody: async (t, driver, node, mockController, mockNode) => {
		t.expect(node.interviewStage).toBe(InterviewStage.Complete);

		// Detect when the node is in the middle of the Version CC interview,
		// which queries the version of each supported CC one by one. Starting
		// the inclusion here means the in-flight interview step still has
		// multiple commands left to send.
		const midVersionInterview = new Promise<void>((resolve) => {
			const detect: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof VersionCCCommandClassGet) {
						resolve();
					}
					// Fall through to the default handlers
					return undefined;
				},
			};
			mockNode.defineBehavior(detect);
		});

		// Re-interview the node and wait until it is busy with the CC interview
		void node.refreshInfo();
		await midVersionInterview;

		// Include another node while the interview is running.
		// The assertion runs synchronously in the event handler: "node added" is
		// emitted in the same tick that ends the inclusion, before the send
		// queue can release any held interview frames.
		const nodeAdded = new Promise<void>((resolve, reject) => {
			driver.controller.once("node added", () => {
				try {
					mockNode.assertReceivedControllerFrame(
						(frame) => frame.type === MockZWaveFrameType.Request,
						{
							noMatch: true,
							errorMessage:
								"The node should not have received any frames while the inclusion was active",
						},
					);
					resolve();
				} catch (e) {
					reject(e);
				}
			});
		});

		mockController.nodePendingInclusion = {
			id: 3,
			capabilities: {
				commandClasses: [CommandClasses.Version],
			},
		};
		await driver.controller.beginInclusion({
			strategy: InclusionStrategy.Insecure,
		});

		// The interview must still be running, otherwise this tests nothing
		t.expect(node.interviewStage).not.toBe(InterviewStage.Complete);

		// From this point on, no interview traffic may reach the node.
		// A command that was already in flight has completed, because the
		// inclusion request above went through the same serialized queue.
		mockNode.clearReceivedControllerFrames();

		await nodeAdded;

		// Afterwards, the interview resumes and completes
		if (node.interviewStage !== InterviewStage.Complete) {
			await new Promise<void>((resolve) => {
				node.once("interview completed", () => resolve());
			});
		}
		t.expect(node.interviewStage).toBe(InterviewStage.Complete);
	},
});

integrationTestMulti(
	"an ongoing interview stays paused until the S2 bootstrapping of another node is completed",
	{
		// debug: true,

		nodeCapabilities: [
			{
				id: 2,
				capabilities: {
					isListening: true,
					isFrequentListening: false,
					commandClasses: [
						CommandClasses.Version,
						CommandClasses["Binary Switch"],
						CommandClasses.Basic,
					],
				},
			},
		],

		customSetup: async (driver, mockController, mockNodes) => {
			const [mockNode2] = mockNodes;
			// Delay responses so the interview spans the inclusion window
			const delayResponses: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					await wait(30);
					// Fall through to the default handlers
					return undefined;
				},
			};
			mockNode2.defineBehavior(delayResponses);
		},

		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node2] = nodes;
			const [mockNode2] = mockNodes;

			t.expect(node2.interviewStage).toBe(InterviewStage.Complete);

			// Detect when the node is in the middle of the Version CC interview,
			// which queries the version of each supported CC one by one. Starting
			// the inclusion here means the in-flight interview step still has
			// multiple commands left to send.
			const midVersionInterview = new Promise<void>((resolve) => {
				const detect: MockNodeBehavior = {
					handleCC(controller, self, receivedCC) {
						if (receivedCC instanceof VersionCCCommandClassGet) {
							resolve();
						}
						// Fall through to the default handlers
						return undefined;
					},
				};
				mockNode2.defineBehavior(detect);
			});

			// Re-interview the node and wait until it is busy with the CC interview
			void node2.refreshInfo();
			await midVersionInterview;

			const assertNoInterviewTraffic = (errorMessage: string) => {
				mockNode2.assertReceivedControllerFrame(
					(frame) => frame.type === MockZWaveFrameType.Request,
					{ noMatch: true, errorMessage },
				);
			};

			// Include an S2-capable node while the interview is running.
			// Received frames accumulate, so this assertion covers the entire
			// key exchange. It runs synchronously in the event handler:
			// "node added" is emitted in the same tick that ends the
			// bootstrapping, before the send queue can release any held
			// interview frames.
			const nodeAdded = new Promise<ZWaveNode>((resolve, reject) => {
				driver.controller.once("node added", (node) => {
					try {
						assertNoInterviewTraffic(
							"The node should not have received any frames before the S2 bootstrapping was completed",
						);
						resolve(node);
					} catch (e) {
						reject(e);
					}
				});
			});

			let inclusionPIN: string | undefined;
			mockController.nodePendingInclusion = {
				id: 3,
				capabilities: {
					commandClasses: [
						CommandClasses["Manufacturer Specific"],
						CommandClasses["Security 2"],
						CommandClasses.Version,
					],
					securityClasses: new Set([
						SecurityClass.S2_Unauthenticated,
					]),
				},
				setup(node) {
					inclusionPIN = node.s2Pin;
				},
			};

			// Errors thrown inside the user callbacks would abort the bootstrapping
			// instead of failing the test, so remember them and check later
			let midBootstrapError: Error | undefined;
			await driver.controller.beginInclusion({
				strategy: InclusionStrategy.Security_S2,
				userCallbacks: {
					async grantSecurityClasses(requested) {
						return requested;
					},
					async validateDSKAndEnterPIN(dsk) {
						// The DSK prompt happens in the middle of the bootstrapping,
						// where interview traffic must still be held back
						try {
							assertNoInterviewTraffic(
								"The node should not have received any frames while the S2 bootstrapping was in progress",
							);
						} catch (e) {
							midBootstrapError = e as Error;
						}
						return inclusionPIN!;
					},
					abort() {},
				},
			});

			// The interview must still be running, otherwise this tests nothing
			t.expect(node2.interviewStage).not.toBe(InterviewStage.Complete);

			// From this point on, no interview traffic may reach the node.
			// A command that was already in flight has completed, because the
			// inclusion request above went through the same serialized queue.
			mockNode2.clearReceivedControllerFrames();

			const newNode = await nodeAdded;
			if (midBootstrapError) throw midBootstrapError;

			// The pause must not interfere with the bootstrapping itself
			t.expect(newNode.getHighestSecurityClass()).toBe(
				SecurityClass.S2_Unauthenticated,
			);

			// Afterwards, the interview resumes and completes
			if (node2.interviewStage !== InterviewStage.Complete) {
				await new Promise<void>((resolve) => {
					node2.once("interview completed", () => resolve());
				});
			}
			t.expect(node2.interviewStage).toBe(InterviewStage.Complete);
		},
	},
);

// FIXME: This currently fails: the interview concurrency group prefers the
// already-running task, so the paused interview keeps the slot and runs to
// completion first, regardless of priority. The planned rework of CC
// interviews as coroutines will allow higher-priority interview tasks to take
// over the group slot at every command boundary, fixing this.
integrationTestMulti.skip(
	"a newly included sleeping node is interviewed before a paused interview continues",
	{
		// debug: true,

		nodeCapabilities: [
			{
				id: 2,
				capabilities: {
					isListening: true,
					isFrequentListening: false,
					commandClasses: [
						CommandClasses.Version,
						CommandClasses["Binary Switch"],
						CommandClasses.Basic,
					],
				},
			},
		],

		customSetup: async (driver, mockController, mockNodes) => {
			const [mockNode2] = mockNodes;
			// Delay responses so the interview spans the inclusion window
			const delayResponses: MockNodeBehavior = {
				async handleCC(controller, self, receivedCC) {
					await wait(30);
					// Fall through to the default handlers
					return undefined;
				},
			};
			mockNode2.defineBehavior(delayResponses);
		},

		testBody: async (t, driver, nodes, mockController, mockNodes) => {
			const [node2] = nodes;
			const [mockNode2] = mockNodes;

			t.expect(node2.interviewStage).toBe(InterviewStage.Complete);

			const completionOrder: number[] = [];
			node2.on("interview completed", () => completionOrder.push(2));

			// Detect when the node is in the middle of the Version CC interview,
			// which queries the version of each supported CC one by one. Starting
			// the inclusion here means the in-flight interview step still has
			// multiple commands left to send.
			const midVersionInterview = new Promise<void>((resolve) => {
				const detect: MockNodeBehavior = {
					handleCC(controller, self, receivedCC) {
						if (receivedCC instanceof VersionCCCommandClassGet) {
							resolve();
						}
						// Fall through to the default handlers
						return undefined;
					},
				};
				mockNode2.defineBehavior(detect);
			});

			// Re-interview the node and wait until it is busy with the CC interview
			void node2.refreshInfo();
			await midVersionInterview;

			// Include a sleeping node while the interview is running.
			// The assertion runs synchronously in the event handler: "node added" is
			// emitted in the same tick that ends the inclusion, before the send
			// queue can release any held interview frames.
			const nodeAdded = new Promise<ZWaveNode>((resolve, reject) => {
				driver.controller.once("node added", (node) => {
					try {
						mockNode2.assertReceivedControllerFrame(
							(frame) =>
								frame.type === MockZWaveFrameType.Request,
							{
								noMatch: true,
								errorMessage:
									"The node should not have received any frames while the inclusion was active",
							},
						);
						resolve(node);
					} catch (e) {
						reject(e);
					}
				});
			});

			mockController.nodePendingInclusion = {
				id: 3,
				capabilities: {
					isListening: false,
					isFrequentListening: false,
					commandClasses: [
						CommandClasses["Wake Up"],
						CommandClasses.Version,
						CommandClasses.Basic,
					],
				},
			};
			await driver.controller.beginInclusion({
				strategy: InclusionStrategy.Insecure,
			});

			// The interview must still be running, otherwise this tests nothing
			t.expect(node2.interviewStage).not.toBe(InterviewStage.Complete);

			// From this point on, no interview traffic may reach the node.
			// A command that was already in flight has completed, because the
			// inclusion request above went through the same serialized queue.
			mockNode2.clearReceivedControllerFrames();

			const node3 = await nodeAdded;
			node3.on("interview completed", () => completionOrder.push(3));

			// The sleeping node's availability window is limited, so its
			// interview takes precedence over continuing node 2's
			await new Promise<void>((resolve) => {
				node3.once("interview completed", () => resolve());
			});
			t.expect(node3.interviewStage).toBe(InterviewStage.Complete);

			if (node2.interviewStage !== InterviewStage.Complete) {
				await new Promise<void>((resolve) => {
					node2.once("interview completed", () => resolve());
				});
			}
			t.expect(node2.interviewStage).toBe(InterviewStage.Complete);
			t.expect(completionOrder).toEqual([3, 2]);
		},
	},
);
