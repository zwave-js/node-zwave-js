import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
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
import { messageIsPing } from "../commandclass/NoOperationCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
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
	serialAPIOrSendDataErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

export const waitForTriggerStateId =
	"sending.handshake.working.executeThread.waitForTrigger";
export const waitForHandshakeResponseStateId =
	"sending.handshake.working.executeThread.waitForHandshakeResponse";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		idle: {};
		sending: {
			states: {
				init: {};
				// TODO: I think handshake deserves to be a sub-machine
				handshake: {
					states: {
						check: {};
						working: {
							states: {
								invokeThread: {
									states: {
										invoking: {};
										invokeDone: {};
									};
								};
								executeThread: {
									states: {
										waitForTrigger: {};
										executeHandshake: {};
										waitForHandshakeResponse: {};
										executeDone: {};
									};
								};
							};
						};
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

export type SendDataErrorData =
	| (SerialAPICommandDoneData & {
			type: "failure";
	  })
	| {
			type: "failure";
			reason: "node timeout";
			result?: undefined;
	  };

export interface SendThreadContext {
	queue: SortedList<Transaction>;
	currentTransaction?: Transaction;
	preTransmitHandshakeTransaction?: Transaction;
	handshakeResponseTransaction?: Transaction;
	sendDataAttempts: number;
	sendDataErrorData?: SendDataErrorData;
}

export type TransactionReducerResult =
	| {
			// Silently drop the transaction
			type: "drop";
	  }
	| {
			// Do nothing (useful especially for the current transaction)
			type: "keep";
	  }
	| {
			// Reject the transaction with the given error
			type: "reject";
			message: string;
			code: ZWaveErrorCodes;
	  }
	| {
			// Changes the priority of the transaction if a new one is given,
			// and moves the current transaction back to the queue
			type: "requeue";
			priority?: MessagePriority;
	  };

export type TransactionReducer = (
	transaction: Transaction,
	source: "queue" | "current",
) => TransactionReducerResult;

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" | "preTransmitHandshake" }
	| {
			type: "nodeUpdate";
			message: ApplicationCommandRequest;
	  }
	| {
			type: "handshakeResponse";
			message: ApplicationCommandRequest;
	  }
	| { type: "unsolicited"; message: Message }
	| { type: "sortQueue" }
	| { type: "NIF"; nodeId: number }
	// Execute the given reducer function for each transaction in the queue
	// and the current transaction and react accordingly. The reducer must not have
	// side-effects because it may be executed multiple times for each transaction
	| { type: "reduce"; reducer: TransactionReducer }
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
	(ctx: SendThreadContext, evt: EventObject) => {
		ctx.currentTransaction!.promise.resolve((evt as any).data.result);
		return ctx;
	},
);

const resolveCurrentTransactionWithMessage = assign(
	(ctx: SendThreadContext, evt: EventObject) => {
		ctx.currentTransaction!.promise.resolve((evt as any).message);
		return ctx;
	},
);

const resolveCurrentTransactionWithoutMessage = assign(
	(ctx: SendThreadContext) => {
		ctx.currentTransaction!.promise.resolve();
		return ctx;
	},
);

const resolveHandshakeResponseTransaction = assign(
	(ctx: SendThreadContext, evt: EventObject) => {
		ctx.handshakeResponseTransaction!.promise.resolve(
			(evt as any).data.result,
		);
		return ctx;
	},
);

const rejectCurrentTransaction = assign(
	(ctx: SendThreadContext, evt: EventObject) => {
		const data = (evt as any).data ?? ctx.sendDataErrorData;
		ctx.currentTransaction!.promise.reject(
			serialAPIOrSendDataErrorToZWaveError(
				data.reason,
				ctx.currentTransaction!.message,
				data.result,
			),
		);
		return ctx;
	},
);

const rejectHandshakeResponseTransaction = assign(
	(ctx: SendThreadContext, evt: EventObject) => {
		const data = (evt as any).data ?? ctx.sendDataErrorData;
		ctx.handshakeResponseTransaction!.promise.reject(
			serialAPIOrSendDataErrorToZWaveError(
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

const resetSendDataAttempts = assign({
	sendDataAttempts: (_: any) => 0,
});

const incrementSendDataAttempts = assign({
	sendDataAttempts: (ctx: SendThreadContext) => ctx.sendDataAttempts + 1,
});

const forwardNodeUpdate = send(
	(_: any, evt: SerialAPICommandEvent) =>
		({
			type: "nodeUpdate",
			message: (evt as any).message,
		} as SendThreadEvent),
);

const forwardHandshakeResponse = send(
	(_: any, evt: SerialAPICommandEvent) =>
		({
			type: "handshakeResponse",
			message: (evt as any).message,
		} as SendThreadEvent),
);

const sortQueue = assign({
	queue: (ctx: SendThreadContext) => {
		const queue = ctx.queue;
		const items = [...queue];
		queue.clear();
		// Since the send queue is a sorted list, sorting is done on insert/add
		queue.add(...items);
		return queue;
	},
});

const rememberNodeTimeoutError = assign<SendThreadContext>({
	sendDataErrorData: (_) => ({
		type: "failure",
		reason: "node timeout",
	}),
});

// function forwardEvents<T extends any[]>(
// 	to: string,
// 	events: T,
// ): TransitionsConfig<SendThreadContext, SendThreadEvent> {
// 	const ret = {} as any;
// 	for (const event of events) {
// 		ret[event] = {
// 			actions: forwardTo<SendThreadContext, SendThreadEvent>(to),
// 		};
// 	}
// 	return ret;
// }

const reduce = assign({
	queue: (ctx: SendThreadContext, evt: SendThreadEvent) => {
		const { queue, currentTransaction } = ctx;

		const drop: Transaction[] = [];
		const requeue: Transaction[] = [];

		const reduceTransaction: (
			...args: Parameters<TransactionReducer>
		) => void = (transaction, source) => {
			const reducerResult = ((evt as any) as SendThreadEvent & {
				type: "reduce";
			}).reducer(transaction, source);
			switch (reducerResult.type) {
				case "drop":
					drop.push(transaction);
					break;
				case "requeue":
					if (reducerResult.priority != undefined) {
						transaction.priority = reducerResult.priority;
					}
					requeue.push(transaction);
					break;
				case "reject":
					transaction.promise.reject(
						new ZWaveError(
							reducerResult.message,
							reducerResult.code,
						),
					);
					drop.push(transaction);
					break;
			}
		};

		for (const transaction of queue) {
			reduceTransaction(transaction, "queue");
		}
		if (currentTransaction) {
			reduceTransaction(currentTransaction, "current");
		}

		// Now we know what to do with the transactions
		queue.remove(...drop, ...requeue);
		queue.add(...requeue);

		return queue;
	},
});

export function createSendThreadMachine(
	implementations: ServiceImplementations,
	initialContext: Partial<SendThreadContext> = {},
): SendThreadMachine {
	const ret = Machine<
		SendThreadContext,
		SendThreadStateSchema,
		SendThreadEvent
	>(
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
						actions: forwardNodeUpdate as any,
					},
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse as any,
					},
					{
						actions: (_: any, evt: any) => {
							implementations.notifyUnsolicited(evt.message);
						},
					},
				],
				// Do the same if the serial API did not handle a message
				serialAPIUnexpected: [
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate as any,
					},
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse as any,
					},
					{
						actions: (_: any, evt: any) => {
							implementations.notifyUnsolicited(evt.message);
						},
					},
				],
				// Accept external commands to sort the queue
				sortQueue: {
					actions: [sortQueue, raise("trigger")],
				},
			},
			states: {
				idle: {
					always: [
						{ cond: "maySendFirstMessage", target: "sending" },
					],
					on: {
						trigger: [
							{ cond: "maySendFirstMessage", target: "sending" },
						],
						reduce: {
							// Reducing may reorder the queue, so raise a trigger afterwards
							actions: [reduce, raise("trigger")],
						},
					},
				},
				sending: {
					initial: "init",
					// Use the first transaction in the queue as the current one
					onEntry: setCurrentTransaction,
					on: {
						NIF: {
							// Pings are not retransmitted and won't receive a response if the node wake up after the ping was sent
							// Therefore resolve pending pings so the communication may proceed immediately
							cond: "currentTransactionIsPingForNode",
							actions: [
								resolveCurrentTransactionWithoutMessage,
								// TODO:
								// log.controller.logNode(
								// 	node.id,
								// 	`Treating the node info as a successful ping...`,
								// );
							],
							target: ".done",
						},
						reduce: [
							// If the current transaction should not be kept, go back to idle
							{
								cond: "shouldNotKeepCurrentTransaction",
								actions: reduce,
								target: ".done",
							},
							{ actions: reduce },
						],
					},
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
							initial: "check",
							states: {
								check: {
									always: [
										// Skip this step if no handshake is required
										{
											cond: "requiresNoHandshake",
											target: "#execute",
										},
										// else begin the handshake process
										{
											target: "working",
										},
									],
								},
								working: {
									type: "parallel",
									states: {
										invokeThread: {
											initial: "invoking",
											states: {
												invoking: {
													invoke: {
														id:
															"kickOffPreTransmitHandshake",
														src:
															"kickOffPreTransmitHandshake",
														onDone: "invokeDone",
													},
												},
												invokeDone: { type: "final" },
											},
										},
										executeThread: {
											initial: "waitForTrigger",
											states: {
												waitForTrigger: {
													on: {
														preTransmitHandshake:
															"executeHandshake",
													},
												},
												executeHandshake: {
													// Swallow the message event while executing
													on: { message: undefined },
													invoke: {
														id: "executeHandshake",
														src:
															"executePreTransmitHandshake",
														autoForward: true,
														onDone: [
															// On success, start waiting for an update
															{
																cond:
																	"executeSuccessful",
																target:
																	"waitForHandshakeResponse",
															},
															// On failure, abort timed out send attempts
															{
																cond:
																	"isSendDataWithCallbackTimeout",
																target:
																	"#abortSendData",
																actions: assign(
																	{
																		sendDataErrorData: (
																			_,
																			evt,
																		) =>
																			evt.data,
																	},
																),
															},
															// And try to retry the entire transaction
															{
																cond:
																	"isSendData",
																target:
																	"#retry",
																actions: assign(
																	{
																		sendDataErrorData: (
																			_,
																			evt,
																		) =>
																			evt.data,
																	},
																),
															},
														],
													},
												},
												waitForHandshakeResponse: {
													on: {
														handshakeResponse: {
															actions: resolveCurrentTransactionWithMessage,
															target:
																"executeDone",
														},
													},
													after: {
														1600: {
															actions: rememberNodeTimeoutError,
															target: "#retry",
														},
													},
												},
												executeDone: { type: "final" },
											},
										},
									},
									onDone: "#execute",
								},
							},
						},
						execute: {
							id: "execute",
							// Swallow the message event while executing
							on: { message: undefined },
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
									actions: rejectCurrentTransaction,
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
													actions: resolveCurrentTransactionWithMessage,
													target: "done",
												},
											},
											after: {
												1600: {
													actions: rememberNodeTimeoutError,
													target: "#retry",
												},
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
											// Swallow the message event while executing
											on: { message: undefined },
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
											// Swallow the message event while executing
											on: { message: undefined },
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
					onDone: {
						target: "idle",
						actions: [
							// Delete the current transaction after we're done
							deleteCurrentTransaction,
							resetSendDataAttempts,
						],
					},
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
				kickOffPreTransmitHandshake: async (ctx) => {
					// Execute the pre transmit handshake and swallow all errors caused by
					// not being able to send the message
					try {
						await (ctx.currentTransaction!
							.message as SendDataRequest).command.preTransmitHandshake();
					} catch (e) {
						if (isSerialCommandError(e)) return;
						throw e;
					}
				},
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
				maySendFirstMessage: (ctx) => {
					// We can't send anything if the queue is empty
					if (ctx.queue.length === 0) return false;
					const nextTransaction = ctx.queue.peekStart()!;

					const message = nextTransaction.message;
					const targetNode = message.getNodeUnsafe();

					// The send queue is sorted automatically. If the first message is for a sleeping node, all messages in the queue are.
					// There are two exceptions:
					// 1. Pings may be used to determine whether a node is really asleep.
					// 2. Responses to handshake requests must always be sent, because some sleeping nodes may try to send us encrypted messages.
					//    If we don't send them, they block the send queue

					return (
						!targetNode ||
						targetNode.isAwake() ||
						messageIsPing(message) ||
						nextTransaction.priority === MessagePriority.Handshake
					);
				},
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
				isExpectedUpdate: (ctx, evt, meta) => {
					if (
						!meta.state.matches(
							"sending.waitForUpdate.waitThread.waiting",
						)
					)
						return false;
					const sentMsg = ctx.currentTransaction!
						.message as SendDataRequest;
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					const receivedMsg = (evt as any).message;
					return (
						receivedMsg instanceof ApplicationCommandRequest &&
						sentMsg.command.isExpectedCCResponse(
							receivedMsg.command,
						)
					);
				},
				isPreTransmitHandshakeForCurrentTransaction: (
					ctx,
					evt,
					meta,
				) => {
					if (!meta.state.matches(waitForTriggerStateId))
						return false;

					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
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
				isExpectedHandshakeResponse: (ctx, evt, meta) => {
					if (!meta.state.matches(waitForHandshakeResponseStateId))
						return false;
					const sentMsg = ctx.preTransmitHandshakeTransaction!
						.message as SendDataRequest;
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					const receivedMsg = (evt as any).message;
					return (
						receivedMsg instanceof ApplicationCommandRequest &&
						sentMsg.command.isExpectedCCResponse(
							receivedMsg.command,
						)
					);
				},
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
				currentTransactionIsPingForNode: (ctx, evt) => {
					const msg = ctx.currentTransaction?.message;
					return (
						!!msg &&
						messageIsPing(msg) &&
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
						msg.getNodeId() === (evt as any).nodeId
					);
				},
				shouldNotKeepCurrentTransaction: (ctx, evt) => {
					// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
					const reducer = (evt as any).reducer;
					return (
						reducer(ctx.currentTransaction, "current").type !==
						"keep"
					);
				},
			},
			delays: {},
		},
	);
	return ret as any;
}
