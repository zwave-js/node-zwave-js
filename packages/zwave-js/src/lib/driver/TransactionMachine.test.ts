import { createModel } from "@xstate/test";
import { assertZWaveError } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import { assign, StateValue } from "xstate";
import { interpret, Interpreter } from "xstate/lib/interpreter";
import { createMachine } from "xstate/lib/Machine";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass";
import { TransmitStatus } from "../controller/_Types";
import { ApplicationCommandRequest } from "../serialapi/application/ApplicationCommandRequest";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "../serialapi/memory/GetControllerIdMessages";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
} from "../serialapi/transport/SendDataMessages";
import { createEmptyMockDriver } from "../test/mocks";
import type { Driver } from "./Driver";
import { createMessageGenerator } from "./MessageGenerators";
import { createWrapperMachine } from "./StateMachineShared";
import { Transaction } from "./Transaction";
import {
	createTransactionMachine,
	TransactionMachineInterpreter,
} from "./TransactionMachine";

interface TestMachineContext {
	retryCount: number;
	maxRetries: number;
}

type TestMachineEvents =
	| {
			type: "CREATE";
			target: string;
	  }
	| { type: "RETRY_TIMEOUT" }
	// The TICK event is necessary to run a tick of the event loop including the message generator
	| { type: "TICK" }
	// The simple execution path
	| { type: "SUCCESS_SIMPLE" }
	| { type: "FAILURE_SIMPLE" }
	// The SendData execution path
	| { type: "SUCCESS_SENDDATA" }
	| { type: "FAILURE_SENDDATA" };

interface MockImplementations {
	notifyRetry: jest.Mock;
	rejectTransaction: jest.Mock;
}

interface TestContext {
	fakeDriver: Driver;
	interpreter: TransactionMachineInterpreter;
	testMessages: Record<string, Message>;
	actualResult?: Message;
	expectedResult?: Message;
	actualError?: Error;
	expectedError?: string;
	forwardedMessages: Message[];
	transactionDone: boolean;
	// implementations: MockImplementations;
}

jest.useFakeTimers();

function assertWrappedMachineState<T extends Interpreter<any, any, any, any>>(
	interpreter: T,
	state: StateValue,
): void {
	// @ts-expect-error for some reason TS doesn't like to access state
	expect(interpreter.children.get("child")!.state.value).toEqual(state);
}

describe("lib/driver/TransactionMachine", () => {
	const testMachine = createMachine<TestMachineContext, TestMachineEvents>(
		{
			id: "TransactionMachineTest",
			initial: "init",
			context: {
				retryCount: 0,
				maxRetries: 0,
			},
			states: {
				init: {
					on: {
						CREATE: [
							{
								cond: (_, evt) =>
									evt.target === "execute_simple",
								target: "execute_simple",
							},
							{
								cond: (_, evt) =>
									evt.target === "execute_senddata",
								target: "execute_senddata",
								actions: assign({
									maxRetries: (_) => 2,
								}),
							},
						],
					},
				},

				// Simple execution path
				execute_simple: { on: { TICK: "respond_simple" } },
				respond_simple: {
					on: {
						SUCCESS_SIMPLE: "finalize_simple",
						FAILURE_SIMPLE: "finalize_simple",
					},
					meta: {
						test: ({
							interpreter,
							forwardedMessages,
							testMessages,
						}: TestContext) => {
							assertWrappedMachineState(interpreter, "execute");
							expect(forwardedMessages).toContain(
								testMessages.GetControllerIdRequest,
							);
						},
					},
				},
				finalize_simple: { on: { TICK: "done" } },

				// SendData execution path
				execute_senddata: { on: { TICK: "respond_senddata" } },
				respond_senddata: {
					on: {
						SUCCESS_SENDDATA: "finalize_senddata",
						FAILURE_SENDDATA: [
							{ cond: "mayRetry", target: "retry_senddata" },
							{ target: "finalize_senddata" },
						],
					},
					meta: {
						test: ({
							interpreter,
							forwardedMessages,
							testMessages,
						}: TestContext) => {
							assertWrappedMachineState(interpreter, "execute");
							expect(forwardedMessages).toContain(
								testMessages.BasicSet,
							);
						},
					},
				},
				retry_senddata: {
					entry: assign({
						retryCount: (ctx) => ctx.retryCount + 1,
					}),
					on: {
						RETRY_TIMEOUT: "execute_senddata",
					},
					meta: {
						test: ({ interpreter }: TestContext) => {
							assertWrappedMachineState(interpreter, "retryWait");
						},
					},
				},
				finalize_senddata: { on: { TICK: "done" } },

				done: {
					meta: {
						test: ({
							transactionDone,
							actualResult,
							expectedResult,
							actualError,
							expectedError,
						}: TestContext) => {
							if (expectedResult) {
								expect(transactionDone).toBe(true);
								expect(actualResult).toBe(expectedResult);
							} else if (expectedError) {
								assertZWaveError(actualError, {
									messageMatches: expectedError,
								});
							}
						},
					},
				},
			},
		},
		{
			guards: {
				mayRetry: (ctx) => ctx.retryCount < ctx.maxRetries,
			},
		},
	);

	const testModel = createModel<TestContext, TestMachineContext>(
		testMachine,
	).withEvents({
		CREATE: {
			// test all possible combinations of transactions
			cases: [
				{ message: "GetControllerIdRequest", target: "execute_simple" },
				{ message: "BasicSet", target: "execute_senddata" },
				{ message: "BasicGet", target: "execute_get" },
			],
		},
		TICK: {
			exec: () => {
				jest.advanceTimersByTime(1);
			},
		},
		RETRY_TIMEOUT: {
			exec: () => {
				jest.advanceTimersByTime(500);
			},
		},

		SUCCESS_SIMPLE: {
			exec: (context) => {
				const { interpreter, testMessages } = context;
				const result = testMessages.GetControllerIdResponse;
				context.expectedResult = result;
				interpreter.send({
					type: "command_success",
					result,
				} as any);
			},
		},
		FAILURE_SIMPLE: {
			exec: (context) => {
				const { interpreter } = context;
				context.expectedResult = undefined;
				context.expectedError = "Timeout while waiting for an ACK";
				interpreter.send({
					type: "command_failure",
					reason: "ACK timeout",
				} as any);
			},
		},

		SUCCESS_SENDDATA: {
			exec: (context) => {
				const { interpreter, forwardedMessages, fakeDriver } = context;
				const sentMessage =
					forwardedMessages[forwardedMessages.length - 1];
				const result = new SendDataRequestTransmitReport(fakeDriver, {
					callbackId: sentMessage.callbackId,
					transmitStatus: TransmitStatus.OK,
				});

				context.expectedResult = result;
				interpreter.send({
					type: "command_success",
					result,
				} as any);
			},
		},
		FAILURE_SENDDATA: {
			exec: (context) => {
				const { interpreter } = context;
				context.expectedResult = undefined;
				context.expectedError = "Failed to send";
				interpreter.send({
					type: "command_failure",
					reason: "response NOK",
				} as any);
			},
		},

		// FAILURE_SIMPLE: {
		// 	exec: ({ interpreter, testTransactions }) => {
		// 		interpreter.send({
		// 			type: "command_failure",
		// 			transaction: testTransactions.GetControllerIdRequest,
		// 			reason: "CAN",
		// 		} as any);
		// 	},
		// },

		// COMMAND_SUCCESS: {
		// 	exec: ({ interpreter }) => {
		// 		interpreter.send({
		// 			type: "command_success",
		// 			message: dummyResponseOK,
		// 		});
		// 	},
		// },
		// COMMAND_FAILURE: {
		// 	exec: ({ interpreter }) => {
		// 		interpreter.send({ type: "message", message: dummyResponseOK });
		// 	},
		// },
	});

	const testPlans = testModel.getSimplePathPlans();

	testPlans.forEach((plan) => {
		if (plan.state.value === "init") return;

		const planDescription = plan.description.replace(
			` (${JSON.stringify(plan.state.context)})`,
			"",
		);
		describe(planDescription, () => {
			plan.paths.forEach((path) => {
				// Use this to limit testing to a single invocation path
				// if (
				// 	!path.description.endsWith(
				// 		`via CREATE ({"message":"BasicSet","target":"execute_senddata"}) → TICK → FAILURE_SENDDATA → RETRY_TIMEOUT → TICK → FAILURE_SENDDATA → RETRY_TIMEOUT → TICK → FAILURE_SENDDATA → TICK`,
				// 	)
				// ) {
				// 	return;
				// }

				it(path.description, () => {
					let context: TestContext;

					// parse message from test description
					// CREATE ({"expectsResponse":false,"expectsCallback":false})
					const createMachineRegex = /CREATE \((?<json>[^\)]+)\)/;
					const match = createMachineRegex.exec(path.description);
					if (!match?.groups?.json)
						return path.test(undefined as any);

					// And create a test machine with it

					const fakeDriver =
						createEmptyMockDriver() as unknown as Driver;
					const ctrlrIdRequest = new GetControllerIdRequest(
						fakeDriver,
					);
					const ctrlrIdResponse = new GetControllerIdResponse(
						fakeDriver,
						{
							data: Buffer.from("01080120dc3452b301de", "hex"),
						},
					);

					const sendDataBasicGet = new SendDataRequest(fakeDriver, {
						command: new BasicCCGet(fakeDriver, {
							nodeId: 2,
						}),
					});

					const sendDataBasicReport = new ApplicationCommandRequest(
						fakeDriver,
						{
							command: new BasicCCReport(fakeDriver, {
								nodeId: 2,
								currentValue: 50,
							}),
						},
					);

					const sendDataBasicSet = new SendDataRequest(fakeDriver, {
						command: new BasicCCSet(fakeDriver, {
							nodeId: 2,
							targetValue: 22,
						}),
					});
					const testMessages = {
						GetControllerIdRequest: ctrlrIdRequest,
						GetControllerIdResponse: ctrlrIdResponse,
						BasicSet: sendDataBasicSet,
						BasicGet: sendDataBasicGet,
						BasicReport: sendDataBasicReport,
					};

					const testCase = JSON.parse(match.groups.json);
					const message = (testMessages as any)[
						testCase.message
					] as Message;
					const { generator, resultPromise } = createMessageGenerator(
						fakeDriver,
						message,
						() => void 0,
					);
					const transaction = new Transaction(fakeDriver, {
						message,
						parts: generator,
						promise: resultPromise,
						priority: MessagePriority.Normal,
					});

					const implementations: MockImplementations = {
						notifyRetry: jest.fn(),
						rejectTransaction: jest
							.fn()
							.mockImplementation((t, e) => {
								resultPromise.reject(e);
							}),
					};

					const machine = createTransactionMachine(
						"T1",
						transaction,
						implementations as any,
					);
					const wrapper = createWrapperMachine(machine);

					// eslint-disable-next-line prefer-const
					context = {
						fakeDriver,
						interpreter: interpret(wrapper),
						testMessages,
						forwardedMessages: [],
						transactionDone: false,
					};
					context.interpreter.onEvent((evt: any) => {
						if (evt.type === "forward" && evt.to === "QUEUE") {
							context.forwardedMessages.push(
								evt.payload.transaction.message,
							);
						} else if (evt.type === "transaction_done") {
							context.transactionDone = true;
						}
					});
					resultPromise
						.then((result) => {
							context.actualResult = result;
						})
						.catch((err) => {
							context.actualError = err;
						});

					// 	.onDone((evt) => {
					// 		context.machineResult = evt.data;
					// 	});
					// context.interpreter.onTransition((state) => {
					// 	if (state.changed) console.log(state.value);
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
