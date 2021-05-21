import { createModel } from "@xstate/test";
import {
	assertZWaveError,
	SecurityManager,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { assign, interpret, Machine, State } from "xstate";
import { BasicCCGet, BasicCCReport, BasicCCSet } from "../commandclass/BasicCC";
import {
	SecurityCCCommandEncapsulation,
	SecurityCCNonceGet,
	SecurityCCNonceReport,
} from "../commandclass/SecurityCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	GetControllerIdRequest,
	GetControllerIdResponse,
} from "../controller/GetControllerIdMessages";
import {
	SendDataRequest,
	SendDataRequestTransmitReport,
} from "../controller/SendDataMessages";
import { TransmitStatus } from "../controller/SendDataShared";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import type { Driver } from "./Driver";
import {
	createSendThreadMachine,
	SendThreadInterpreter,
	SendThreadMachineParams,
} from "./SendThreadMachine";
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
		unsolicited_senddata: {};
		// The "secure" path tests a one-way SendData transaction
		// with a handshake
		handshake_secure: {};
		handshake_execute_secure: {};
		handshake_wait_secure: {};
		execute_secure: {};
		retry_secure: {};
		done_secure: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

interface TestMachineContext {
	expectsUpdate?: boolean;
	sendDataAttempts: number;
	retryCount: number;
}

type TestMachineEvents =
	| { type: "ADD_SIMPLE" }
	| { type: "FAILURE_SIMPLE" }
	| { type: "SUCCESS_SIMPLE" }
	| { type: "ADD_SENDDATA" }
	| { type: "FAILURE_SENDDATA" }
	| { type: "SUCCESS_SENDDATA" }
	| { type: "UNSOLICITED_SENDDATA" }
	| { type: "UPDATE_SENDDATA" }
	//
	| { type: "RETRY_TIMEOUT" }
	| { type: "WAIT_TIMEOUT" }
	//
	| { type: "ADD_SECURE" }
	| { type: "HANDSHAKE_ADD_SECURE" }
	| { type: "HANDSHAKE_FAILURE_SECURE" }
	| { type: "HANDSHAKE_SUCCESS_SECURE" }
	| { type: "HANDSHAKE_UPDATE_SECURE" }
	| { type: "SUCCESS_SECURE" }
	| { type: "FAILURE_SECURE" };

interface MockImplementations {
	notifyRetry: jest.Mock;
	notifyUnsolicited: jest.Mock;
	resolveTransaction: jest.Mock;
	rejectTransaction: jest.Mock;
}

interface TestContext {
	fakeDriver: Driver;
	testTransactions: Record<string, Transaction>;
	interpreter: SendThreadInterpreter;
	sentTransaction?: Transaction;
	sendDataResponse?: Message;
	expectedResult?: Message;
	expectedReason?: string;
	implementations: MockImplementations;
	preTransmitHandshakePromise: DeferredPromise<void>;
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

describe("lib/driver/SendThreadMachine", () => {
	beforeEach(() => {
		mockCommandQueueMachine.mockClear();
	});

	for (const retryAfterTransmitReport of [true, false]) {
		const machineParams: SendThreadMachineParams = {
			timeouts: {
				ack: 1000,
				response: 1600,
				report: 10000,
				sendDataCallback: 65000,
			},
			attempts: {
				controller: 3,
				// @ts-expect-error this property is not defined, we just use it to deduplicate test code
				sendData: 3,
				retryAfterTransmitReport,
			},
		};

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
					retryCount: 0,
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
							ADD_SECURE: "handshake_secure",
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
										.handshakeTransaction,
								).toBeUndefined();
								expect(
									interpreter.state.context
										.currentTransaction,
								).toBe(sentTransaction);
							},
						},
					},
					done_simple: {
						meta: {
							test: async ({
								interpreter,
								implementations,
								sentTransaction,
								expectedResult,
							}: TestContext) => {
								expect(interpreter.state.value).toBe("idle");
								if (expectedResult) {
									expect(
										implementations.resolveTransaction,
									).toBeCalledWith(
										sentTransaction,
										expectedResult,
									);
								} else {
									expect(
										implementations.rejectTransaction,
									).toBeCalled();
									expect(
										implementations.rejectTransaction.mock
											.calls[0][0],
									).toBe(sentTransaction);
									assertZWaveError(
										implementations.rejectTransaction.mock
											.calls[0][1],
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
								{
									cond: "expectsUpdate",
									target: "wait_senddata",
								},
								{ target: "done_senddata" },
							],
							FAILURE_SENDDATA: [
								{ cond: "mayRetry", target: "retry_senddata" },
								{ target: "done_senddata" },
							],
						},
					},
					wait_senddata: {
						on: {
							UPDATE_SENDDATA: "done_senddata",
							WAIT_TIMEOUT: [
								...(retryAfterTransmitReport
									? [
											{
												cond: "mayRetry",
												target: "retry_senddata",
											},
									  ]
									: []),
								{ target: "done_senddata" },
							],
							UNSOLICITED_SENDDATA: "unsolicited_senddata",
						},
						meta: {
							test: ({ interpreter }: TestContext) => {
								expect(interpreter.state.value).toEqual({
									sending: "waitForUpdate",
								});
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
								expect(interpreter.state.value).toEqual({
									sending: "retryWait",
								});
							},
						},
					},
					done_senddata: {
						meta: {
							test: (
								{
									interpreter,
									implementations,
									sentTransaction,
									expectedResult,
								}: TestContext,
								state: State<TestMachineContext>,
							) => {
								expect(interpreter.state.value).toBe("idle");
								expect(
									implementations.notifyRetry,
								).toHaveBeenCalledTimes(
									state.context.retryCount,
								);
								expect(
									interpreter.state.context.sendDataAttempts,
								).toBe(0);
								expect(
									interpreter.state.context
										.currentTransaction,
								).toBeUndefined();

								if (expectedResult) {
									expect(
										implementations.resolveTransaction,
									).toBeCalledWith(
										sentTransaction,
										expectedResult,
									);
								} else {
									expect(
										implementations.rejectTransaction,
									).toBeCalled();
									expect(
										implementations.rejectTransaction.mock
											.calls[0][0],
									).toBe(sentTransaction);
									assertZWaveError(
										implementations.rejectTransaction.mock
											.calls[0][1],
									);
								}
							},
						},
					},
					unsolicited_senddata: {
						meta: {
							test: ({
								implementations,
								expectedResult,
							}: TestContext) => {
								expect(
									implementations.notifyUnsolicited,
								).toBeCalledWith(expectedResult);
							},
						},
					},

					handshake_secure: {
						entry: assign({
							sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
						}),
						on: {
							HANDSHAKE_ADD_SECURE: "handshake_execute_secure",
						},
						meta: {
							test: async ({
								interpreter,
								testTransactions,
							}: TestContext) => {
								// waiting for the handshake transaction to be added
								expect(
									interpreter.state.matches(
										"sending.handshake",
									),
								).toBeTrue();
								expect(
									(testTransactions.BasicSetSecure
										.message as SendDataRequest).command
										.preTransmitHandshake,
								).toBeCalled();
							},
						},
					},
					handshake_execute_secure: {
						on: {
							HANDSHAKE_SUCCESS_SECURE: "handshake_wait_secure",
							HANDSHAKE_FAILURE_SECURE: [
								{ cond: "mayRetry", target: "retry_secure" },
								{ target: "done_secure" },
							],
						},
						meta: {
							test: async ({ interpreter }: TestContext) => {
								// waiting for the handshake transaction to be executed
								expect(
									interpreter.state.matches(
										"sending.handshake",
									),
								).toBeTrue();
							},
						},
					},
					handshake_wait_secure: {
						on: {
							HANDSHAKE_UPDATE_SECURE: "execute_secure",
						},
						meta: {
							test: async ({ interpreter }: TestContext) => {
								// waiting for a response to the handshake transaction
								expect(
									interpreter.state.matches(
										"sending.handshake.waitForHandshakeResponse",
									),
								).toBeTrue();
							},
						},
					},
					execute_secure: {
						on: {
							SUCCESS_SECURE: "done_secure",
							FAILURE_SECURE: [
								{ cond: "mayRetry", target: "retry_secure" },
								{ target: "done_secure" },
							],
						},
						meta: {
							test: async ({ interpreter }: TestContext) => {
								// executing the actual transaction
								expect(interpreter.state.value).toEqual({
									sending: "execute",
								});
							},
						},
					},
					retry_secure: {
						entry: assign({
							retryCount: (ctx) => ctx.retryCount + 1,
						}),
						on: {
							RETRY_TIMEOUT: "handshake_secure",
						},
						meta: {
							test: ({ interpreter }: TestContext) => {
								expect(interpreter.state.value).toEqual({
									sending: "retryWait",
								});
							},
						},
					},
					done_secure: {
						meta: {
							test: async ({ interpreter }: TestContext) => {
								expect(interpreter.state.value).toBe("idle");
							},
						},
					},
				},
			},
			{
				guards: {
					expectsUpdate: (ctx) => !!ctx.expectsUpdate,
					mayRetry: (ctx) =>
						ctx.sendDataAttempts <
						(machineParams.attempts as any).sendData,
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
					const result =
						testTransactions.GetControllerIdResponse.message;
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
					const {
						interpreter,
						sentTransaction,
						fakeDriver,
					} = context;
					const result = new SendDataRequestTransmitReport(
						fakeDriver,
						{
							callbackId: sentTransaction!.message.callbackId,
							transmitStatus: TransmitStatus.OK,
						},
					);
					context.expectedResult = result;
					interpreter.send({
						type: "command_success",
						transaction: sentTransaction,
						result,
					} as any);
				},
			},
			FAILURE_SENDDATA: {
				exec: (context) => {
					const { interpreter, sentTransaction } = context;
					context.expectedResult = undefined;
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
						// updates are returned by the serial API command machine as "unsolicited"
						type: "unsolicited",
						// type: "message",
						message,
					} as any);
				},
			},
			UNSOLICITED_SENDDATA: {
				exec: (context) => {
					const { interpreter, testTransactions } = context;
					const message = testTransactions.BasicSet.message;
					context.expectedResult = message;
					interpreter.send({
						type: "unsolicited",
						message,
					} as any);
				},
			},

			ADD_SECURE: {
				exec: ({ interpreter, testTransactions }) => {
					interpreter.send({
						type: "add",
						transaction: testTransactions.BasicSetSecure,
					});
				},
			},
			HANDSHAKE_ADD_SECURE: {
				exec: (context) => {
					const { interpreter, testTransactions } = context;
					context.sentTransaction = testTransactions.NonceRequest;
					interpreter.send({
						type: "add",
						transaction: context.sentTransaction,
					});
				},
			},
			HANDSHAKE_SUCCESS_SECURE: {
				exec: (context) => {
					const {
						interpreter,
						sentTransaction,
						fakeDriver,
					} = context;
					const result = new SendDataRequestTransmitReport(
						fakeDriver,
						{
							callbackId: sentTransaction!.message.callbackId,
							transmitStatus: TransmitStatus.OK,
						},
					);
					context.expectedResult = result;
					interpreter.send({
						type: "command_success",
						transaction: sentTransaction,
						result,
					} as any);
				},
			},
			HANDSHAKE_FAILURE_SECURE: {
				exec: (context) => {
					const { interpreter, sentTransaction } = context;
					context.expectedResult = undefined;
					interpreter.send({
						type: "command_failure",
						transaction: sentTransaction,
						reason: "CAN",
					} as any);
				},
			},
			HANDSHAKE_UPDATE_SECURE: {
				exec: ({
					interpreter,
					testTransactions,
					preTransmitHandshakePromise,
				}) => {
					interpreter.send({
						// updates are returned by the serial API command machine as "unsolicited"
						type: "unsolicited",
						// type: "message",
						message: testTransactions.NonceResponse.message,
					});
					preTransmitHandshakePromise.resolve();
					// little hack because the event queue seems to work differently on Node.js 10
					return new Promise((resolve) => setImmediate(resolve));
				},
			},

			SUCCESS_SECURE: {
				exec: (context) => {
					const {
						interpreter,
						sentTransaction,
						fakeDriver,
						testTransactions,
					} = context;
					const result = new SendDataRequestTransmitReport(
						fakeDriver,
						{
							callbackId: sentTransaction!.message.callbackId,
							transmitStatus: TransmitStatus.OK,
						},
					);
					context.expectedResult = result;
					interpreter.send({
						type: "command_success",
						transaction: testTransactions.BasicSetSecure,
						result,
					} as any);
				},
			},
			FAILURE_SECURE: {
				exec: (context) => {
					const { interpreter, testTransactions } = context;
					context.expectedResult = undefined;
					interpreter.send({
						type: "command_failure",
						transaction: testTransactions.BasicSetSecure,
						reason: "response NOK",
					} as any);
				},
			},

			RETRY_TIMEOUT: {
				exec: () => {
					jest.advanceTimersByTime(500);
				},
			},
			WAIT_TIMEOUT: {
				exec: (context) => {
					// After a timeout, we no longer expect a response
					context.expectedResult = undefined;
					jest.advanceTimersByTime(machineParams.timeouts.report);
				},
			},
		});

		const testPlans = testModel.getSimplePathPlans();

		testPlans.forEach((plan) => {
			// if (plan.state.value === "idle") return;
			if (
				typeof plan.state.value !== "string" ||
				(plan.state.value !== "idle" &&
					!plan.state.value.startsWith("done_") &&
					!plan.state.value.startsWith("unsolicited_"))
			) {
				return;
			}

			const planDescription = plan.description.replace(
				` (${JSON.stringify(plan.state.context)})`,
				"",
			);
			describe(`(retryAfterTransmitReport = ${retryAfterTransmitReport}) ${planDescription}`, () => {
				plan.paths.forEach((path) => {
					// if (
					// 	!path.description.endsWith(
					// 		`via ADD_SENDDATA ({"command":"BasicGet"}) → SUCCESS_SENDDATA → WAIT_TIMEOUT → RETRY_TIMEOUT → SUCCESS_SENDDATA → WAIT_TIMEOUT → RETRY_TIMEOUT → SUCCESS_SENDDATA → UPDATE_SENDDATA`,
					// 	)
					// ) {
					// 	return;
					// }

					it(path.description, () => {
						const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
						fakeDriver.options.attempts.sendData = (machineParams.attempts as any).sendData;
						fakeDriver.options.attempts.retryAfterTransmitReport = retryAfterTransmitReport;
						const sm = new SecurityManager({
							ownNodeId: 1,
							nonceTimeout: 500,
							networkKey: Buffer.alloc(16, 1),
						});
						(fakeDriver as any).securityManager = sm;

						const ctrlrIdRequest = new GetControllerIdRequest(
							fakeDriver,
						);
						const ctrlrIdResponse = new GetControllerIdResponse(
							fakeDriver,
							{
								data: Buffer.from(
									"01080120dc3452b301de",
									"hex",
								),
							},
						);

						const sendDataBasicGet = new SendDataRequest(
							fakeDriver,
							{
								command: new BasicCCGet(fakeDriver, {
									nodeId: 2,
								}),
							},
						);

						const sendDataBasicReport = new ApplicationCommandRequest(
							fakeDriver,
							{
								command: new BasicCCReport(fakeDriver, {
									nodeId: 2,
									currentValue: 50,
								}),
							},
						);

						const sendDataBasicSet = new SendDataRequest(
							fakeDriver,
							{
								command: new BasicCCSet(fakeDriver, {
									nodeId: 2,
									targetValue: 22,
								}),
							},
						);

						const sendDataBasicSetSecure = new SendDataRequest(
							fakeDriver,
							{
								command: new SecurityCCCommandEncapsulation(
									fakeDriver,
									{
										nodeId: 2,
										encapsulated: new BasicCCSet(
											fakeDriver,
											{
												nodeId: 2,
												targetValue: 1,
											},
										),
									},
								),
							},
						);

						const sendDataNonceRequest = new SendDataRequest(
							fakeDriver,
							{
								command: new SecurityCCNonceGet(fakeDriver, {
									nodeId: 2,
								}),
							},
						);

						const sendDataNonceResponse = new ApplicationCommandRequest(
							fakeDriver,
							{
								command: new SecurityCCNonceReport(fakeDriver, {
									nodeId: 2,
									nonce: Buffer.allocUnsafe(8),
								}),
							},
						);
						function createTransaction(
							msg: Message,
							priority: MessagePriority = MessagePriority.Normal,
						) {
							const ret = new Transaction(
								fakeDriver,
								msg,
								createDeferredPromise(),
								priority,
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
							BasicSetSecure: createTransaction(
								sendDataBasicSetSecure,
							),
							NonceRequest: createTransaction(
								sendDataNonceRequest,
								MessagePriority.PreTransmitHandshake,
							),
							NonceResponse: createTransaction(
								sendDataNonceResponse,
							),
						};

						const implementations: MockImplementations = {
							notifyRetry: jest.fn(),
							notifyUnsolicited: jest.fn(),
							resolveTransaction: jest.fn(),
							rejectTransaction: jest.fn(),
						};
						const machine = createSendThreadMachine(
							implementations as any,
							machineParams,
						);

						const context: TestContext = {
							interpreter: interpret(machine),
							implementations,
							fakeDriver,
							testTransactions,
							preTransmitHandshakePromise: undefined as any,
						};

						sendDataBasicSetSecure.command.preTransmitHandshake = jest
							.fn()
							.mockImplementation(() => {
								context.preTransmitHandshakePromise = createDeferredPromise();
								return context.preTransmitHandshakePromise;
							});

						const sentCommand = (path.segments.find(
							(s) => s.event.type === "ADD_SENDDATA",
						)?.event as any)?.command;
						if (sentCommand) {
							context.sentTransaction = (testTransactions as any)[
								sentCommand
							];
						}

						// context.interpreter.onTransition((ctx) => {
						// 	console.log(ctx.toStrings());
						// });
						// context.interpreter.onEvent((evt) => {
						// 	console.log(JSON.stringify(evt));
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
	}
});
