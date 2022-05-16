import { createModel } from "@xstate/test";
import { SecurityManager } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { assign, interpret, Machine, State } from "xstate";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	SendDataAbort,
	SendDataRequest,
} from "../serialapi/transport/SendDataMessages";
import { dummyCallbackNOK, dummyResponseNOK } from "../test/messages";
import { createEmptyMockDriver } from "../test/mocks";
import {
	CommandQueueInterpreter,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import type { Driver } from "./Driver";
import type {
	SerialAPICommandDoneData,
	SerialAPICommandError,
} from "./SerialAPICommandMachine";
import { createWrapperMachine } from "./StateMachineShared";
import { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
interface TestMachineStateSchema {
	states: {
		idle: {};
		sending: {};
		aborting: {};
		maybeDone: {};
		done: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

interface TestMachineContext {
	transactions?: Transaction[];
	index: number;
	expectedCalls: number;
	definitelyDone: boolean;
}

type TestMachineEvents =
	| {
			type: "ADD";
			transaction: Transaction;
	  }
	// | { type: "ABORT" }
	| {
			type: "API_FAILED" | "ABORT_FAILED";
			reason: (SerialAPICommandDoneData & {
				type: "failure";
			})["reason"];
	  }
	| { type: "API_SUCCESS" | "ABORT_SUCCESS"; result: Message };

interface TestContext {
	interpreter: CommandQueueInterpreter;
	expectedTransactions: Transaction[];
	expectedResults: Message[];
	actualResults: Message[];
	expectedReasons: SerialAPICommandError[];
	actualReasons: SerialAPICommandError[];
}

jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

describe("lib/driver/CommandQueueMachine", () => {
	const fakeDriver = createEmptyMockDriver() as unknown as Driver;
	const sm = new SecurityManager({
		ownNodeId: 1,
		nonceTimeout: 500,
		networkKey: Buffer.alloc(16, 1),
	});
	(fakeDriver as any).securityManager = sm;

	const sendDataBasicGet = new SendDataRequest(fakeDriver, {
		command: new BasicCCGet(fakeDriver, {
			nodeId: 2,
		}),
	});

	const sendDataBasicReport = new SendDataRequest(fakeDriver, {
		command: new BasicCCReport(fakeDriver, {
			nodeId: 2,
			currentValue: 50,
		}),
	});

	const sendDataBasicSet = new SendDataRequest(fakeDriver, {
		command: new BasicCCSet(fakeDriver, {
			nodeId: 2,
			targetValue: 22,
		}),
	});

	function createTransaction(msg: Message) {
		const ret = new Transaction(fakeDriver, {
			message: msg,
			promise: createDeferredPromise(),
			priority: MessagePriority.Normal,
			parts: {
				current: msg,
			} as any,
		});
		(ret as any).toJSON = () => ({
			message: msg.constructor.name,
		});
		return ret;
	}

	const testTransactions = {
		BasicSet: createTransaction(sendDataBasicSet),
		BasicGet: createTransaction(sendDataBasicGet),
		BasicReport: createTransaction(sendDataBasicReport),
		"response NOK": createTransaction(dummyResponseNOK),
		"callback NOK": createTransaction(dummyCallbackNOK),
	};

	beforeEach(() => {
		mockSerialAPIMachine.mockReset();
	});

	const testMachine = Machine<
		TestMachineContext,
		TestMachineStateSchema,
		TestMachineEvents
	>(
		{
			id: "CommandQueueTest",
			initial: "idle",
			context: {
				index: -1,
				expectedCalls: 0,
				definitelyDone: false,
			},
			states: {
				idle: {
					on: {
						ADD: {
							target: "sending",
							actions: assign<TestMachineContext, any>({
								transactions: (_, evt) =>
									evt.commands.map(
										// @ts-expect-error
										(cmd) => testTransactions[cmd],
									),
							}),
						},
					},
				},
				sending: {
					entry: assign<TestMachineContext, any>({
						index: (ctx) => ctx.index + 1,
						expectedCalls: (ctx) => ctx.expectedCalls + 1,
					}),
					on: {
						API_SUCCESS: "maybeDone",
						API_FAILED: [
							{ cond: "isCbTimeout", target: "aborting" },
							{ target: "maybeDone" },
						],
						// ABORT: {
						// 	actions: assign<TestMachineContext, any>({
						// 		definitelyDone: true,
						// 	}),
						// 	target: "aborting",
						// },
					},
					meta: {
						test: async (
							{ expectedTransactions }: TestContext,
							state: State<TestMachineContext>,
						) => {
							expect(mockSerialAPIMachine).toBeCalledTimes(
								state.context.expectedCalls,
							);
							expect(
								mockSerialAPIMachine.mock.calls[
									state.context.expectedCalls - 1
								][0],
							).toBe(
								expectedTransactions[state.context.index]
									.message,
							);
						},
					},
				},
				aborting: {
					entry: assign<TestMachineContext, any>({
						expectedCalls: (ctx) => ctx.expectedCalls + 1,
					}),
					on: {
						ABORT_SUCCESS: "maybeDone",
						ABORT_FAILED: "maybeDone",
					},
					meta: {
						test: async (
							_: TestContext,
							state: State<TestMachineContext>,
						) => {
							expect(mockSerialAPIMachine).toBeCalledTimes(
								state.context.expectedCalls,
							);
							expect(
								mockSerialAPIMachine.mock.calls[
									state.context.expectedCalls - 1
								][0],
							).toBeInstanceOf(SendDataAbort);
						},
					},
				},
				maybeDone: {
					always: [
						{ cond: "definitelyDone", target: "done" },
						{ cond: "queueEmpty", target: "done" },
						{ target: "sending" },
					],
				},
				done: {
					meta: {
						test: async ({
							interpreter,
							actualResults,
							expectedResults,
							actualReasons,
							expectedReasons,
						}: TestContext) => {
							expect(
								// @ts-expect-error 🤷🏻‍♂️
								interpreter.children.get("child")!.state.value,
							).toBe("idle");
							expect(actualResults).toContainAllValues(
								expectedResults,
							);
							expect(actualReasons).toContainAllValues(
								expectedReasons,
							);
						},
					},
				},
			},
		},
		{
			guards: {
				definitelyDone: (ctx) => ctx.definitelyDone,
				queueEmpty: (ctx) => {
					// index is increased in the next step, so we need to add +1 here
					return ctx.index + 1 >= (ctx.transactions?.length ?? 0);
				},
				isCbTimeout: (_, evt: any) => evt.reason === "callback timeout",
			},
		},
	);

	const testModel = createModel<TestContext, TestMachineContext>(
		testMachine,
	).withEvents({
		ADD: {
			exec: ({ interpreter }, event) => {
				const cmds = (event as any).commands as string[];
				for (const cmd of cmds) {
					interpreter.send({
						type: "add",
						// @ts-expect-error
						transaction: testTransactions[cmd],
						from: "T1",
					});
				}
			},
			cases: [
				{ commands: ["BasicGet"] },
				{ commands: ["BasicSet", "BasicGet"] },
			],
		},
		ABORT: {
			exec: ({ interpreter }) => {
				interpreter.send({
					// @ts-expect-error
					type: "remove",
					transaction: interpreter.state.context.currentTransaction,
				});
			},
		},
		API_SUCCESS: {
			exec: ({ interpreter }, event) => {
				interpreter.send({
					type: "done.invoke.execute",
					data: {
						type: "success",
						// @ts-expect-error
						result: testTransactions[event.command].message,
					},
				} as any);
			},
			cases: [{ command: "BasicReport" }],
		},
		API_FAILED: {
			exec: ({ interpreter }, event) => {
				interpreter.send({
					type: "done.invoke.execute",
					data: {
						type: "failure",
						// @ts-expect-error
						reason: event.reason,
						// @ts-expect-error
						message: testTransactions[event.reason]?.message,
					},
				} as any);
			},
			cases: [
				{ reason: "send failure" },
				{ reason: "CAN" },
				{ reason: "NAK" },
				{ reason: "ACK timeout" },
				{ reason: "response timeout" },
				{ reason: "callback timeout" },
				{ reason: "response NOK" },
				{ reason: "callback NOK" },
			],
		},
		ABORT_SUCCESS: {
			exec: ({ interpreter }) => {
				interpreter.send({
					type: "done.invoke.executeSendDataAbort",
					data: {
						type: "success",
					},
				} as any);
			},
		},
		ABORT_FAILED: {
			exec: ({ interpreter }, event) => {
				interpreter.send({
					type: "done.invoke.executeSendDataAbort",
					data: {
						type: "failure",
						// @ts-expect-error
						reason: event.reason,
						// @ts-expect-error
						message: testTransactions[event.reason]?.message,
					},
				} as any);
			},
			cases: [
				{ reason: "send failure" },
				{ reason: "CAN" },
				{ reason: "NAK" },
				{ reason: "ACK timeout" },
			],
		},
	});

	const testPlans = testModel.getSimplePathPlans();

	testPlans.forEach((plan) => {
		if (plan.state.value === "idle") return;
		// if (plan.state.value !== "done") return;

		const planDescription = plan.description.replace(
			` (${JSON.stringify(plan.state.context)})`,
			"",
		);
		describe(planDescription, () => {
			plan.paths.forEach((path) => {
				// Use this to limit testing to a single invocation path
				// if (
				// 	!path.description.endsWith(
				// 		`via ADD ({"commands":["BasicSet","BasicGet"]}) → API_FAILED ({"reason":"callback timeout"}) → ABORT_FAILED ({"reason":"callback timeout"}) → RESET → ABORT_FAILED ({"reason":"callback NOK"})`,
				// 	)
				// ) {
				// 	return;
				// }

				it(path.description, () => {
					const machine = createCommandQueueMachine(
						{
							createSendDataAbort: () =>
								new SendDataAbort(fakeDriver),
						} as any,
						{} as any,
					);

					const expectedResults = path.segments
						.filter((s) => s.event.type === "API_SUCCESS")
						.map((s) => s.event)
						// @ts-expect-error
						.map((evt) => testTransactions[evt.command].message);

					const expectedReasons = path.segments
						.filter((s) => s.event.type === "API_FAILED")
						.map((s) => (s.event as any).reason);

					const expectedTransactions = path.segments
						.filter((s) => s.event.type === "ADD")
						.map((s) => (s.event as any).commands)
						.reduce((acc, cur) => [...acc, ...cur], [])
						// @ts-expect-error
						.map((cmd) => testTransactions[cmd]);

					const wrapper = createWrapperMachine(machine);

					const context: TestContext = {
						interpreter: interpret(wrapper),
						actualResults: [],
						expectedResults,
						actualReasons: [],
						expectedReasons,
						expectedTransactions,
					};
					context.interpreter.onEvent((evt) => {
						// Events that are sent to the transaction machine need their payload inspected
						if (evt.type === "forward") evt = (evt as any).payload;
						if (evt.type === "command_success") {
							context.actualResults.push((evt as any).result);
						} else if (evt.type === "command_failure") {
							context.actualReasons.push((evt as any).reason);
						}
					});
					// context.interpreter.onTransition((state, evt) => {
					// 	console.log(
					// 		`in state ${state.value} b/c of ${JSON.stringify(
					// 			evt,
					// 		)}`,
					// 	);
					// });
					context.interpreter.start();

					return path.test(context);
				});
			});
		});
	});

	it("coverage", () => {
		testModel.testCoverage({
			filter: (stateNode) => {
				return !!stateNode.meta;
			},
		});
	});
});
