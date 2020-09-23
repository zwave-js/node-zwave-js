import { createModel } from "@xstate/test";
import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { assign, interpret, Machine, State } from "xstate";
import { ApplicationCommandRequest } from "zwave-js/src/lib/controller/ApplicationCommandRequest";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "../controller/GetControllerIdMessages";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
	TransmitStatus,
} from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import type { Driver } from "./Driver";
import {
	createSendThreadMachine,
	SendThreadInterpreter,
} from "./SendThreadMachineV2";
import { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
interface TestMachineStateSchema {
	states: {
		idle: {};
		// The "simple" path tests a controller message
		// (no retrying on the message level, no handshakes)
		execute_simple: {};
		done_simple: {};
		// The "SendData" path tests a SendData transaction
		// (including retrying, no handshakes, with and without update)
		execute_senddata: {};
		wait_senddata: {};
		retry_senddata: {};
		done_senddata: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

interface TestMachineContext {
	expectsUpdate?: boolean;
	sendDataAttempts: number;
}

type TestMachineEvents =
	| { type: "ADD_SIMPLE" }
	| { type: "FAILURE_SIMPLE" }
	| { type: "SUCCESS_SIMPLE" }
	| { type: "ADD_SENDDATA" }
	| { type: "FAILURE_SENDDATA" }
	| { type: "SUCCESS_SENDDATA" }
	| { type: "RETRY_TIMEOUT" }
	| { type: "UPDATE_SENDDATA" }
	| { type: "WAIT_TIMEOUT" };

interface TestContext {
	fakeDriver: Driver;
	testTransactions: Record<string, Transaction>;
	interpreter: SendThreadInterpreter;
	sentTransaction?: Transaction;
	sendDataResponse?: Message;
	expectedResult?: Message;
	expectedReason?: string;
}

jest.useFakeTimers();
jest.mock("./CommandQueueMachine");
const mockCommandQueueMachine = jest.requireMock("./CommandQueueMachine")
	.createCommandQueueMachine as jest.Mock;
mockCommandQueueMachine.mockReturnValue(
	Machine<any, any, any>({
		initial: "dummy",
		states: {
			dummy: {},
		},
	}),
);

describe("lib/driver/SendThreadMachineV2", () => {
	beforeEach(() => {
		mockCommandQueueMachine.mockClear();
	});

	const testMachine = Machine<
		TestMachineContext,
		TestMachineStateSchema,
		TestMachineEvents
	>(
		{
			id: "SendThreadTest",
			initial: "idle",
			context: {
				sendDataAttempts: 0,
			},
			states: {
				idle: {
					on: {
						ADD_SIMPLE: "execute_simple",
						ADD_SENDDATA: {
							target: "execute_senddata",
							actions: assign({
								expectsUpdate: (_, evt: any) =>
									evt.command === "BasicGet",
							}),
						},
					},
					meta: {
						test: async ({ interpreter }: TestContext) => {
							expect(interpreter.state.value).toBe("idle");
							expect(
								interpreter.state.context.commandQueue,
							).not.toBeUndefined();
						},
					},
				},
				execute_simple: {
					on: {
						SUCCESS_SIMPLE: "done_simple",
						FAILURE_SIMPLE: "done_simple",
					},
					meta: {
						test: async ({
							interpreter,
							sentTransaction,
						}: TestContext) => {
							expect(interpreter.state.value).toEqual({
								sending: "execute",
							});
							expect(
								interpreter.state.context
									.preTransmitHandshakeTransaction,
							).toBeUndefined();
							expect(
								interpreter.state.context.currentTransaction,
							).toBe(sentTransaction);
						},
					},
				},
				done_simple: {
					meta: {
						test: async ({
							interpreter,
							sentTransaction,
							expectedResult,
						}: TestContext) => {
							expect(interpreter.state.value).toBe("idle");
							if (expectedResult) {
								await expect(
									sentTransaction!.promise,
								).resolves.toBe(expectedResult);
							} else {
								await assertZWaveError(
									() => sentTransaction!.promise,
									{
										errorCode:
											ZWaveErrorCodes.Controller_MessageDropped,
									},
								);
							}
						},
					},
				},
				execute_senddata: {
					entry: assign({
						sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
					}),
					on: {
						SUCCESS_SENDDATA: [
							{ cond: "expectsUpdate", target: "wait_senddata" },
							{ target: "done_senddata" },
						],
						FAILURE_SENDDATA: [
							{ cond: "mayRetry", target: "retry_senddata" },
							{ target: "done_senddata" },
						],
					},
					// meta: {
					// 	test: async (
					// 		{ interpreter }: TestContext,
					// 		state: State<TestMachineContext>,
					// 	) => {},
					// },
				},
				wait_senddata: {
					on: {
						UPDATE_SENDDATA: "done_senddata",
						WAIT_TIMEOUT: [
							{ cond: "mayRetry", target: "retry_senddata" },
							{ target: "done_senddata" },
						],
					},
					meta: {
						test: async (
							{ interpreter }: TestContext,
							state: State<TestMachineContext>,
						) => {
							expect(interpreter.state.value).toEqual({
								sending: "waitForUpdate",
							});
						},
					},
				},
				retry_senddata: {
					on: {
						RETRY_TIMEOUT: "execute_senddata",
					},
					meta: {
						test: async (
							{ interpreter }: TestContext,
							state: State<TestMachineContext>,
						) => {
							expect(interpreter.state.value).toEqual({
								sending: "retryWait",
							});
						},
					},
				},
				done_senddata: {
					meta: {
						test: async ({
							interpreter,
							sentTransaction,
							expectedResult,
						}: TestContext) => {
							expect(interpreter.state.value).toBe("idle");
							if (expectedResult) {
								await expect(
									sentTransaction!.promise,
								).resolves.toBe(expectedResult);
							} else {
								await assertZWaveError(
									() => sentTransaction!.promise,
								);
							}
						},
					},
				},
			},
		},
		{
			guards: {
				expectsUpdate: (ctx) => !!ctx.expectsUpdate,
				mayRetry: (ctx) => ctx.sendDataAttempts < 3,
			},
		},
	);

	const testModel = createModel<TestContext, TestMachineContext>(
		testMachine,
	).withEvents({
		ADD_SIMPLE: {
			exec: (context) => {
				const { interpreter, testTransactions } = context;
				context.sentTransaction =
					testTransactions.GetControllerIdRequest;
				interpreter.send({
					type: "add",
					transaction: context.sentTransaction,
				});
			},
		},
		SUCCESS_SIMPLE: {
			exec: (context) => {
				const { interpreter, testTransactions } = context;
				const result = testTransactions.GetControllerIdResponse.message;
				context.expectedResult = result;
				interpreter.send({
					type: "command_success",
					transaction: testTransactions.GetControllerIdRequest,
					result,
				} as any);
			},
		},
		FAILURE_SIMPLE: {
			exec: ({ interpreter, testTransactions }) => {
				interpreter.send({
					type: "command_failure",
					transaction: testTransactions.GetControllerIdRequest,
					reason: "CAN",
				} as any);
			},
		},
		ADD_SENDDATA: {
			exec: ({ interpreter, testTransactions }, event) => {
				interpreter.send({
					type: "add",
					// @ts-expect-error
					transaction: testTransactions[event.command],
				});
			},
			cases: [{ command: "BasicSet" }, { command: "BasicGet" }],
		},
		SUCCESS_SENDDATA: {
			exec: (context) => {
				const { interpreter, sentTransaction, fakeDriver } = context;
				const result = new SendDataRequestTransmitReport(fakeDriver, {
					callbackId: sentTransaction!.message.callbackId,
					transmitStatus: TransmitStatus.OK,
				});
				context.expectedResult = result;
				interpreter.send({
					type: "command_success",
					transaction: sentTransaction,
					result,
				} as any);
			},
		},
		FAILURE_SENDDATA: {
			exec: ({ interpreter, sentTransaction }) => {
				interpreter.send({
					type: "command_failure",
					transaction: sentTransaction,
					reason: "response NOK",
				} as any);
			},
		},
		UPDATE_SENDDATA: {
			// Send the expected update
			exec: (context) => {
				const { interpreter, testTransactions } = context;
				const message = testTransactions.BasicReport.message;
				context.expectedResult = message;
				interpreter.send({
					type: "message",
					message,
				} as any);
			},
		},
		// UNSOLICITED_SENDDATA: {
		// 	exec: (context) => {
		// 		const { interpreter, testTransactions } = context;
		// 		const message = testTransactions.BasicReport.message;
		// 		context.expectedResult = message;
		// 		interpreter.send({
		// 			type: "serialAPIUnexpected",
		// 			message,
		// 		} as any);
		// 	},
		// },
		RETRY_TIMEOUT: {
			exec: () => {
				jest.advanceTimersByTime(500);
			},
		},
		WAIT_TIMEOUT: {
			exec: (context) => {
				// After a timeout, we no longer expect a response
				context.expectedResult = undefined;
				jest.advanceTimersByTime(1600);
			},
		},
	});

	const testPlans = testModel.getSimplePathPlans();

	testPlans.forEach((plan) => {
		// if (plan.state.value === "idle") return;

		const planDescription = plan.description.replace(
			` (${JSON.stringify(plan.state.context)})`,
			"",
		);
		describe(planDescription, () => {
			plan.paths.forEach((path) => {
				// if (
				// 	!path.description.endsWith(
				// 		`ADD_SENDDATA ({"command":"BasicGet"}) → FAILURE_SENDDATA → RETRY_TIMEOUT → FAILURE_SENDDATA → RETRY_TIMEOUT → FAILURE_SENDDATA`,
				// 	)
				// ) {
				// 	return;
				// }

				it(path.description, () => {
					const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
					// const sm = new SecurityManager({
					// 	ownNodeId: 1,
					// 	nonceTimeout: 500,
					// 	networkKey: Buffer.alloc(16, 1),
					// });
					// (fakeDriver as any).securityManager = sm;

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

					function createTransaction(msg: Message) {
						const ret = new Transaction(
							fakeDriver,
							msg,
							createDeferredPromise(),
							MessagePriority.Normal,
						);
						(ret as any).toJSON = () => ({
							message: msg.constructor.name,
						});
						return ret;
					}

					const testTransactions = {
						GetControllerIdRequest: createTransaction(
							ctrlrIdRequest,
						),
						GetControllerIdResponse: createTransaction(
							ctrlrIdResponse,
						),
						BasicSet: createTransaction(sendDataBasicSet),
						BasicGet: createTransaction(sendDataBasicGet),
						BasicReport: createTransaction(sendDataBasicReport),
					};

					const machine = createSendThreadMachine({} as any);

					// const expectedResults = path.segments
					// 	.filter((s) => s.event.type === "API_SUCCESS")
					// 	.map((s) => s.event)
					// 	// @ts-expect-error
					// 	.map((evt) => testTransactions[evt.command].message);

					// const expectedReasons = path.segments
					// 	.filter((s) => s.event.type === "API_FAILED")
					// 	.map((s) => (s.event as any).reason);

					// const expectedTransactions = path.segments
					// 	.filter((s) => s.event.type === "ADD")
					// 	.map((s) => (s.event as any).commands)
					// 	.reduce((acc, cur) => [...acc, ...cur], [])
					// 	// @ts-expect-error
					// 	.map((cmd) => testTransactions[cmd]);

					const context: TestContext = {
						interpreter: interpret(machine),
						fakeDriver,
						testTransactions,
					};
					const sentCommand = (path.segments.find(
						(s) => s.event.type === "ADD_SENDDATA",
					)?.event as any)?.command;
					if (sentCommand) {
						context.sentTransaction = (testTransactions as any)[
							sentCommand
						];
					}

					context.interpreter.onEvent((evt) => {
						// if (evt.type === "command_success") {
						// 	context.actualResults.push((evt as any).result);
						// } else if (evt.type === "command_failure") {
						// 	context.actualReasons.push((evt as any).reason);
						// }
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
