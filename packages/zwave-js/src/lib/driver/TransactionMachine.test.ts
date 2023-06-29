import { createModel } from "@xstate/test";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "@zwave-js/cc";
import {
	MessagePriority,
	TransmitStatus,
	assertZWaveError,
} from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import ava, { type ExecutionContext, type TestFn } from "ava";
import sinon from "sinon";
import { assign, type StateValue } from "xstate";
import { createMachine } from "xstate/lib/Machine";
import { interpret, type Interpreter } from "xstate/lib/interpreter";
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
	type TransactionMachineInterpreter,
} from "./TransactionMachine";

interface AvaTestContext {
	clock: sinon.SinonFakeTimers;
}

const test = ava as TestFn<AvaTestContext>;

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
	notifyRetry: sinon.SinonStub;
	rejectTransaction: sinon.SinonStub;
}

interface TestContext {
	avaExecutionContext: ExecutionContext<AvaTestContext>;
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

function assertWrappedMachineState<T extends Interpreter<any, any, any, any>>(
	t: ExecutionContext<AvaTestContext>,
	interpreter: T,
	state: StateValue,
): void {
	// @ts-expect-error for some reason TS doesn't like to access state
	t.deepEqual(interpreter.children.get("child")!.state.value, state);
}

test.before((t) => {
	t.context.clock = sinon.useFakeTimers();
});

test.after.always((t) => {
	t.context.clock.restore();
});

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
							cond: (_, evt) => evt.target === "execute_simple",
							target: "execute_simple",
						},
						{
							cond: (_, evt) => evt.target === "execute_senddata",
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
						avaExecutionContext: t,
						interpreter,
						forwardedMessages,
						testMessages,
					}: TestContext) => {
						assertWrappedMachineState(t, interpreter, "execute");
						t.true(
							forwardedMessages.includes(
								testMessages.GetControllerIdRequest,
							),
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
						avaExecutionContext: t,
						interpreter,
						forwardedMessages,
						testMessages,
					}: TestContext) => {
						assertWrappedMachineState(t, interpreter, "execute");
						t.true(
							forwardedMessages.includes(testMessages.BasicSet),
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
					test: ({
						avaExecutionContext: t,
						interpreter,
					}: TestContext) => {
						assertWrappedMachineState(t, interpreter, "retryWait");
					},
				},
			},
			finalize_senddata: { on: { TICK: "done" } },

			done: {
				meta: {
					test: ({
						avaExecutionContext: t,
						transactionDone,
						actualResult,
						expectedResult,
						actualError,
						expectedError,
					}: TestContext) => {
						if (expectedResult) {
							t.is(transactionDone, true);
							t.is(actualResult, expectedResult);
						} else if (expectedError) {
							assertZWaveError(t, actualError, {
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
	// @ts-expect-error
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
		exec: ({ avaExecutionContext: t }) => {
			return t.context.clock.tickAsync(1);
		},
	},
	RETRY_TIMEOUT: {
		exec: ({ avaExecutionContext: t }) => {
			return t.context.clock.tickAsync(500);
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
			const sentMessage = forwardedMessages[forwardedMessages.length - 1];
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

	plan.paths.forEach((path) => {
		// Use this to limit testing to a single invocation path
		// if (
		// 	!path.description.endsWith(
		// 		`via CREATE ({"message":"BasicSet","target":"execute_senddata"}) → TICK → FAILURE_SENDDATA → RETRY_TIMEOUT → TICK → FAILURE_SENDDATA → RETRY_TIMEOUT → TICK → FAILURE_SENDDATA → TICK`,
		// 	)
		// ) {
		// 	return;
		// }

		test.serial(`${planDescription} ${path.description}`, async (t) => {
			let context: TestContext;

			// parse message from test description
			// CREATE ({"expectsResponse":false,"expectsCallback":false})
			const createMachineRegex = /CREATE \((?<json>[^\)]+)\)/;
			const match = createMachineRegex.exec(path.description);
			if (!match?.groups?.json) {
				await path.test(undefined as any);
				t.pass();
				return;
			}

			// And create a test machine with it

			const fakeDriver = createEmptyMockDriver() as unknown as Driver;
			const ctrlrIdRequest = new GetControllerIdRequest(fakeDriver);
			const ctrlrIdResponse = new GetControllerIdResponse(fakeDriver, {
				data: Buffer.from("01080120dc3452b301de", "hex"),
			});

			const sendDataBasicGet = new SendDataRequest(fakeDriver, {
				command: new BasicCCGet(fakeDriver, {
					nodeId: 2,
				}),
				maxSendAttempts: 3,
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
				maxSendAttempts: 3,
			});
			const testMessages = {
				GetControllerIdRequest: ctrlrIdRequest,
				GetControllerIdResponse: ctrlrIdResponse,
				BasicSet: sendDataBasicSet,
				BasicGet: sendDataBasicGet,
				BasicReport: sendDataBasicReport,
			};

			const testCase = JSON.parse(match.groups.json);
			const message = (testMessages as any)[testCase.message] as Message;
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
				notifyRetry: sinon.stub(),
				rejectTransaction: sinon.stub().callsFake((t, e) => {
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
				avaExecutionContext: t,
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

			await path.test(context);
			t.pass();
		});
	});
});

test.serial("coverage", (t) => {
	testModel.testCoverage({
		filter: (stateNode) => {
			return !!stateNode.meta;
		},
	});
	t.pass();
});
