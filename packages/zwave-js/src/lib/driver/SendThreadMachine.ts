import { SortedList } from "alcalzone-shared/sorted-list";
import {
	assign,
	EventObject,
	Interpreter,
	Machine,
	StateMachine,
} from "xstate";
import { raise, send } from "xstate/lib/actions";
import type { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import {
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import type { Message } from "../message/Message";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandEvent,
} from "./SerialAPICommandMachine";
import {
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
	sendDataAttempts: number;
	sendDataErrorData?: SerialAPICommandDoneData & {
		type: "failure";
	};
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" }
	| { type: "nodeUpdate"; message: ApplicationCommandRequest }
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

const setCurrentTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	currentTransaction: ctx.queue.shift()!,
}));

const deleteCurrentTransaction = assign((ctx: SendThreadContext) => ({
	...ctx,
	currentTransaction: undefined,
}));

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
				add: {
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
				// The send thread accepts any message as long as the serial API machine is not active.
				// If it is expected it will be forwarded to the correct states. If not, it
				// will be returned with the "unsolicited" event.
				message: [
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
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
						actions: respondUnexpected("unsolicited"),
					},
				],
			},
			states: {
				idle: {
					on: {
						"": { cond: "queueNotEmpty", target: "sending" },
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
							on: {
								"": [
									{
										cond: "isSendData",
										actions: incrementSendDataAttempts,
										target: "execute",
									},
									{ target: "execute" },
								],
							},
						},
						execute: {
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
							invoke: {
								id: "executeSendDataAbort",
								src: "executeSendDataAbort",
								autoForward: true,
								onDone: "retry",
							},
						},
						retry: {
							id: "retry",
							on: {
								"": [
									// If we may retry, wait a bit first
									{ target: "retryWait", cond: "mayRetry" },
									// On failure, reject it with a matching error
									{
										actions: rejectCurrentTransaction as any,
										target: "done",
									},
								],
							},
						},
						retryWait: {
							// invoke: {
							// 	id: "notify",
							// 	src: "notifyRetry",
							// },
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
										idle: { type: "final" },
										responding: {},
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
				executeSendDataAbort: (_) =>
					createSerialAPICommandMachine(
						implementations.createSendDataAbort(),
						implementations,
					),
			},
			guards: {
				queueNotEmpty: (ctx) => ctx.queue.length > 0,
				executeSuccessful: (_, evt: any) => evt.data.type === "success",
				executeSuccessfulExpectsUpdate: (ctx, evt: any) =>
					evt.data.type === "success" &&
					ctx.currentTransaction?.message instanceof
						SendDataRequest &&
					ctx.currentTransaction.message.expectsNodeUpdate(),
				isSendData: (ctx) => {
					const msg = ctx.currentTransaction?.message;
					return (
						msg instanceof SendDataRequest ||
						msg instanceof SendDataMulticastRequest
					);
				},
				isExpectedUpdate: (ctx, evt, meta) =>
					meta.state.matches(
						"sending.waitForUpdate.waitThread.waiting",
					)
						? (ctx.currentTransaction!
								.message as SendDataRequest).isExpectedNodeUpdate(
								((evt as any)
									.message as ApplicationCommandRequest)
									.command,
						  )
						: false,
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
			},
			delays: {},
		},
	);
}
