import { SortedList } from "alcalzone-shared/sorted-list";
import {
	assign,
	EventObject,
	Interpreter,
	Machine,
	StateMachine,
} from "xstate";
import { raise, send } from "xstate/lib/actions";
import type { CommandClass } from "../commandclass/CommandClass";
import type { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandEvent,
} from "./SerialAPICommandMachine";
import {
	isSerialCommandError,
	respondUnexpected,
	serialAPICommandErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		idle: {};
		sending: {
			states: {
				init: {};
				handshake: {
					states: {
						init: {};
						executeHandshake: {};
						waitForTrigger: {};
						waitForHandshakeResponse: {};
					};
				};
				execute: {};
				waitForUpdate: {
					states: {
						waitThread: {
							states: {
								waiting: {};
								done: {};
							};
						};
						handshakeServer: {
							states: {
								idle: {};
								responding: {};
								abortResponding: {};
							};
						};
					};
				};
				abortSendData: {};
				retry: {};
				retryWait: {};
				done: {};
			};
		};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface SendThreadContext {
	queue: SortedList<Transaction>;
	currentTransaction?: Transaction;
	preTransmitHandshakeTransaction?: Transaction;
	handshakeResponseTransaction?: Transaction;
	sendDataAttempts: number;
	sendDataErrorData?: SerialAPICommandDoneData & {
		type: "failure";
	};
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" | "preTransmitHandshake" }
	| {
			type: "nodeUpdate" | "handshakeResponse";
			message: ApplicationCommandRequest;
	  }
	| { type: "unsolicited"; message: Message }
	| SerialAPICommandEvent;

export type SendThreadMachine = StateMachine<
	SendThreadContext,
	SendThreadStateSchema,
	SendThreadEvent
>;
export type SendThreadInterpreter = Interpreter<
	SendThreadContext,
	SendThreadStateSchema,
	SendThreadEvent
>;

// These actions must be assign actions or they will be executed
// out of order
const resolveCurrentTransaction = assign(
	(
		ctx: SendThreadContext,
		evt: EventObject & {
			data: SerialAPICommandDoneData & {
				type: "success";
			};
		},
	) => {
		ctx.currentTransaction!.promise.resolve(evt.data.result);
		return ctx;
	},
);

const resolveCurrentTransactionWithMessage = assign(
	(ctx: SendThreadContext, evt: SendThreadEvent & { type: "nodeUpdate" }) => {
		ctx.currentTransaction!.promise.resolve(evt.message);
		return ctx;
	},
);

const resolveHandshakeResponseTransaction = assign(
	(
		ctx: SendThreadContext,
		evt: EventObject & {
			data: SerialAPICommandDoneData & {
				type: "success";
			};
		},
	) => {
		ctx.handshakeResponseTransaction!.promise.resolve(evt.data.result);
		return ctx;
	},
);

const rejectCurrentTransaction = assign(
	(
		ctx: SendThreadContext,
		evt: EventObject & {
			data: SerialAPICommandDoneData & {
				type: "failure";
			};
		},
	) => {
		const data = evt.data ?? ctx.sendDataErrorData;
		ctx.currentTransaction!.promise.reject(
			serialAPICommandErrorToZWaveError(
				data.reason,
				ctx.currentTransaction!.message,
				data.result,
			),
		);
		return ctx;
	},
);

const rejectHandshakeResponseTransaction = assign(
	(
		ctx: SendThreadContext,
		evt: EventObject & {
			data: SerialAPICommandDoneData & {
				type: "failure";
			};
		},
	) => {
		const data = evt.data ?? ctx.sendDataErrorData;
		ctx.handshakeResponseTransaction!.promise.reject(
			serialAPICommandErrorToZWaveError(
				data.reason,
				ctx.currentTransaction!.message,
				data.result,
			),
		);
		return ctx;
	},
);

const setCurrentTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	currentTransaction: ctx.queue.shift()!,
}));

const deleteCurrentTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	currentTransaction: undefined,
}));

const setHandshakeResponseTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	handshakeResponseTransaction: ctx.queue.shift()!,
}));

const deleteHandshakeResponseTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	handshakeResponseTransaction: undefined,
}));

const executePreTransmitHandshake = (ctx: SendThreadContext) => {
	// Execute the pre transmit handshake and swallow all errors caused by
	// not being able to send the message
	(ctx.currentTransaction!.message as SendDataRequest).command
		.preTransmitHandshake()
		.catch((e) => {
			if (isSerialCommandError(e)) return;
			throw e;
		});
};

const resetSendDataAttempts = assign({
	sendDataAttempts: (_: any) => 0,
});

const incrementSendDataAttempts = assign({
	sendDataAttempts: (ctx: SendThreadContext) => ctx.sendDataAttempts + 1,
});

const forwardNodeUpdate = send(
	(_: any, evt: SerialAPICommandEvent & { type: "message" }) => ({
		type: "nodeUpdate",
		message: evt.message,
	}),
);

const forwardHandshakeResponse = send(
	(_: any, evt: SerialAPICommandEvent & { type: "message" }) => ({
		type: "handshakeResponse",
		message: evt.message,
	}),
);

export function createSendThreadMachine(
	implementations: ServiceImplementations,
	initialContext: Partial<SendThreadContext> = {},
): SendThreadMachine {
	return Machine<SendThreadContext, SendThreadStateSchema, SendThreadEvent>(
		{
			id: "SendThread",
			initial: "idle",
			context: {
				queue: new SortedList(),
				// currentTransaction: undefined,
				sendDataAttempts: 0,
				...initialContext,
			},
			on: {
				add: [
					// We have control over when pre transmit handshakes are created
					// so we can trigger them immediately without queuing
					{
						cond: "isPreTransmitHandshakeForCurrentTransaction",
						actions: [
							assign({
								preTransmitHandshakeTransaction: (_, evt) =>
									evt.transaction,
							}),
							raise("preTransmitHandshake"),
						],
					},
					{
						actions: [
							assign({
								queue: (ctx, evt) => {
									ctx.queue.add(evt.transaction);
									return ctx.queue;
								},
							}),
							raise("trigger"),
						],
					},
				],
				// The send thread accepts any message as long as the serial API machine is not active.
				// If it is expected it will be forwarded to the correct states. If not, it
				// will be returned with the "unsolicited" event.
				message: [
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
					},
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse,
					},
					{
						actions: respondUnexpected("unsolicited"),
					},
				],
				// Do the same if the serial API did not handle a message
				serialAPIUnexpected: [
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
					},
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse,
					},
					{
						actions: respondUnexpected("unsolicited"),
					},
				],
			},
			states: {
				idle: {
					always: [{ cond: "queueNotEmpty", target: "sending" }],
					on: {
						trigger: "sending",
					},
				},
				sending: {
					initial: "init",
					// Use the first transaction in the queue as the current one
					onEntry: setCurrentTransaction,
					// And delete it after we're done
					onExit: [deleteCurrentTransaction, resetSendDataAttempts],
					states: {
						init: {
							always: [
								{
									cond: "isSendData",
									actions: incrementSendDataAttempts,
									target: "handshake",
								},
								{ target: "execute" },
							],
						},
						handshake: {
							initial: "init",
							states: {
								init: {
									always: [
										// Skip this step if no handshake is required
										{
											cond: "requiresNoHandshake",
											target: "#execute",
										},
										// else kick it off
										{
											actions: executePreTransmitHandshake,
											target: "waitForTrigger",
										},
									],
								},
								waitForTrigger: {
									on: {
										preTransmitHandshake:
											"executeHandshake",
									},
								},
								executeHandshake: {
									invoke: {
										id: "executeHandshake",
										src: "executePreTransmitHandshake",
										autoForward: true,
										onDone: [
											// On success, start waiting for an update
											{
												cond: "executeSuccessful",
												target:
													"waitForHandshakeResponse",
											},
											// On failure, abort timed out send attempts
											{
												cond:
													"isSendDataWithCallbackTimeout",
												target: "#abortSendData",
												actions: assign({
													sendDataErrorData: (
														_,
														evt,
													) => evt.data,
												}),
											},
											// And try to retry the entire transaction
											{
												cond: "isSendData",
												target: "#retry",
												actions: assign({
													sendDataErrorData: (
														_,
														evt,
													) => evt.data,
												}),
											},
										],
									},
								},
								waitForHandshakeResponse: {
									on: {
										handshakeResponse: {
											actions: resolveCurrentTransactionWithMessage as any,
											target: "#execute",
										},
									},
									after: {
										1600: "#retry",
									},
								},
							},
						},
						execute: {
							id: "execute",
							invoke: {
								id: "execute",
								src: "execute",
								autoForward: true,
								onDone: [
									// On success, start waiting for an update
									{
										cond: "executeSuccessfulExpectsUpdate",
										target: "waitForUpdate",
									},
									// or resolve the current transaction if none is required
									{
										cond: "executeSuccessful",
										actions: resolveCurrentTransaction,
										target: "done",
									},
									// On failure, retry SendData commands if possible
									// but timed out send attempts must be aborted first
									{
										cond: "isSendDataWithCallbackTimeout",
										target: "abortSendData",
										actions: assign({
											sendDataErrorData: (_, evt) =>
												evt.data,
										}),
									},
									{
										cond: "isSendData",
										target: "retry",
										actions: assign({
											sendDataErrorData: (_, evt) =>
												evt.data,
										}),
									},
									// Reject simple API commands immediately with a matching error
									{
										actions: rejectCurrentTransaction,
										target: "done",
									},
								],
							},
						},
						abortSendData: {
							id: "abortSendData",
							invoke: {
								id: "executeSendDataAbort",
								src: "executeSendDataAbort",
								autoForward: true,
								onDone: "retry",
							},
						},
						retry: {
							id: "retry",
							always: [
								// If we may retry, wait a bit first
								{ target: "retryWait", cond: "mayRetry" },
								// On failure, reject it with a matching error
								{
									actions: rejectCurrentTransaction as any,
									target: "done",
								},
							],
						},
						retryWait: {
							invoke: {
								id: "notify",
								src: "notifyRetry",
							},
							after: {
								500: "init",
							},
						},
						waitForUpdate: {
							type: "parallel",
							states: {
								waitThread: {
									initial: "waiting",
									states: {
										waiting: {
											// When the expected update is received, resolve the transaction and stop waiting
											on: {
												nodeUpdate: {
													actions: resolveCurrentTransactionWithMessage as any,
													target: "done",
												},
											},
											after: {
												1600: "#retry",
											},
										},
										done: { type: "final" },
									},
								},
								handshakeServer: {
									initial: "idle",
									states: {
										// As long as we're not replying, the handshake server is done
										idle: {
											onEntry: deleteHandshakeResponseTransaction,
											type: "final",
											always: [
												{
													cond:
														"queueContainsResponseToHandshakeRequest",
													target: "responding",
												},
											],
											on: {
												trigger: [
													{
														cond:
															"queueContainsResponseToHandshakeRequest",
														target: "responding",
													},
												],
											},
										},
										responding: {
											onEntry: setHandshakeResponseTransaction,
											invoke: {
												id: "executeHandshakeResponse",
												src: "executeHandshakeResponse",
												autoForward: true,
												onDone: [
													// On success, don't do anything else
													{
														cond:
															"executeSuccessful",
														actions: resolveHandshakeResponseTransaction,
														target: "idle",
													},
													// On failure, abort timed out send attempts and do nothing else
													{
														cond:
															"isSendDataWithCallbackTimeout",
														target:
															"abortResponding",
														actions: assign({
															sendDataErrorData: (
																_,
																evt,
															) => evt.data,
														}),
													},
													// Reject it otherwise with a matching error
													{
														actions: rejectHandshakeResponseTransaction,
														target: "idle",
													},
												],
											},
										},
										abortResponding: {
											invoke: {
												id: "executeSendDataAbort",
												src: "executeSendDataAbort",
												autoForward: true,
												onDone: "idle",
											},
										},
									},
								},
							},
							onDone: "done",
						},
						done: {
							type: "final",
						},
					},
					onDone: "idle",
				},
			},
		},
		{
			services: {
				execute: (ctx) =>
					createSerialAPICommandMachine(
						ctx.currentTransaction!.message,
						implementations,
					),
				executePreTransmitHandshake: (ctx) =>
					createSerialAPICommandMachine(
						ctx.preTransmitHandshakeTransaction!.message,
						implementations,
					),
				executeHandshakeResponse: (ctx) =>
					createSerialAPICommandMachine(
						ctx.handshakeResponseTransaction!.message,
						implementations,
					),
				executeSendDataAbort: (_) =>
					createSerialAPICommandMachine(
						implementations.createSendDataAbort(),
						implementations,
					),
				notifyRetry: (ctx) => {
					implementations.notifyRetry?.(
						"SendData",
						ctx.sendDataAttempts,
						(ctx.currentTransaction!.message as SendDataRequest)
							.maxSendAttempts,
						500,
					);
					return Promise.resolve();
				},
			},
			guards: {
				queueNotEmpty: (ctx) => ctx.queue.length > 0,
				executeSuccessful: (_, evt: any) => evt.data.type === "success",
				executeSuccessfulExpectsUpdate: (ctx, evt: any) =>
					evt.data.type === "success" &&
					ctx.currentTransaction?.message instanceof
						SendDataRequest &&
					(ctx.currentTransaction
						.message as SendDataRequest).command.expectsCCResponse(),
				isSendData: (ctx) => {
					const msg = ctx.currentTransaction?.message;
					return (
						msg instanceof SendDataRequest ||
						msg instanceof SendDataMulticastRequest
					);
				},
				isSendDataSinglecast: (ctx) => {
					const msg = ctx.currentTransaction?.message;
					return msg instanceof SendDataRequest;
				},
				isExpectedUpdate: (ctx, evt, meta) =>
					meta.state.matches(
						"sending.waitForUpdate.waitThread.waiting",
					) &&
					(ctx.currentTransaction!
						.message as SendDataRequest).command.isExpectedCCResponse(
						((evt as any).message as ApplicationCommandRequest)
							.command,
					),
				isPreTransmitHandshakeForCurrentTransaction: (
					ctx,
					evt,
					meta,
				) => {
					if (!meta.state.matches("sending.handshake.waitForTrigger"))
						return false;

					const transaction = (evt as any).transaction as Transaction;
					if (
						transaction.priority !==
						MessagePriority.PreTransmitHandshake
					)
						return false;
					if (!(transaction.message instanceof SendDataRequest))
						return false;
					const curCommand = (ctx.currentTransaction!
						.message as SendDataRequest).command;
					const newCommand = (transaction.message as SendDataRequest)
						.command;
					// require the handshake to be for the same node
					return newCommand.nodeId === curCommand.nodeId;
				},
				isExpectedHandshakeResponse: (ctx, evt, meta) =>
					meta.state.matches(
						"sending.handshake.waitForHandshakeResponse",
					) &&
					(ctx.preTransmitHandshakeTransaction!
						.message as SendDataRequest).command.isExpectedCCResponse(
						((evt as any).message as ApplicationCommandRequest)
							.command,
					),
				queueContainsResponseToHandshakeRequest: (ctx) => {
					const next = ctx.queue.peekStart();
					return next?.priority === MessagePriority.Handshake;
				},
				isSendDataWithCallbackTimeout: (ctx, evt: any) => {
					const msg = ctx.currentTransaction?.message;
					return (
						(msg instanceof SendDataRequest ||
							msg instanceof SendDataMulticastRequest) &&
						evt.data?.type === "failure" &&
						evt.data?.reason === "callback timeout"
					);
				},
				mayRetry: (ctx) => {
					const msg = ctx.currentTransaction!.message;
					if (msg instanceof SendDataMulticastRequest) {
						// Don't try to resend multicast messages if they were already transmitted.
						// One or more nodes might have already reacted
						if (ctx.sendDataErrorData!.reason === "callback NOK") {
							return false;
						}
					}
					return (
						(msg as SendDataRequest | SendDataMulticastRequest)
							.maxSendAttempts > ctx.sendDataAttempts
					);
				},
				requiresNoHandshake: (ctx) => {
					const msg = ctx.currentTransaction?.message;
					if (!(msg instanceof SendDataRequest)) {
						return true;
					}
					return !(msg.command as CommandClass).requiresPreTransmitHandshake();
				},
			},
			delays: {},
		},
	);
}
