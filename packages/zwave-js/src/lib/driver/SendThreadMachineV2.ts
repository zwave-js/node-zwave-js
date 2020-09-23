import { SortedList } from "alcalzone-shared/sorted-list";
import {
	assign,
	AssignAction,
	forwardTo,
	Interpreter,
	Machine,
	MachineOptions,
	spawn,
	StateMachine,
} from "xstate";
import { pure, raise } from "xstate/lib/actions";
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
	CommandQueueEvent,
	CommandQueueInterpreter,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import { TransactionReducer } from "./SendThreadMachine";
import type { SerialAPICommandDoneData } from "./SerialAPICommandMachine";
import {
	sendDataErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		init: {};
		idle: {};
		sending: {
			states: {
				beforeSend: {};
				handshake: {};
				execute: {};
				waitForUpdate: {};
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
	commandQueue: CommandQueueInterpreter;
	queue: SortedList<Transaction>;
	currentTransaction?: Transaction;
	handshakeTransaction?: Transaction;
	sendDataAttempts: number;
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" }
	| {
			type: "nodeUpdate";
			result: ApplicationCommandRequest;
	  }
	| {
			type: "handshakeResponse";
			result: ApplicationCommandRequest;
	  }
	| { type: "unsolicited"; message: Message }
	| { type: "sortQueue" }
	| { type: "NIF"; nodeId: number }
	// Execute the given reducer function for each transaction in the queue
	// and the current transaction and react accordingly. The reducer must not have
	// side-effects because it may be executed multiple times for each transaction
	| { type: "reduce"; reducer: TransactionReducer }
	// These events are forwarded to the SerialAPICommand machine
	| { type: "ACK" }
	| { type: "CAN" }
	| { type: "NAK" }
	| { type: "message"; message: Message }
	| (CommandQueueEvent &
			({ type: "command_success" } | { type: "command_failure" }));

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

// These actions must be assign actions or they will be executed out of order

const setCurrentTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx) => ({
		...ctx,
		currentTransaction: ctx.queue.shift()!,
	}),
);

const deleteCurrentTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx) => ({
		...ctx,
		currentTransaction: undefined,
	}),
);

const deleteHandshakeTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx) => ({
		...ctx,
		handshakeTransaction: undefined,
	}),
);

const resetSendDataAttempts: AssignAction<SendThreadContext, any> = assign({
	sendDataAttempts: (_) => 0,
});

const incrementSendDataAttempts: AssignAction<SendThreadContext, any> = assign({
	sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
});

const forwardToCommandQueue = forwardTo<any, any>((ctx) => ctx.commandQueue);

const currentTransactionIsSendData = (ctx: SendThreadContext) => {
	const msg = ctx.currentTransaction?.message;
	return (
		msg instanceof SendDataRequest ||
		msg instanceof SendDataMulticastRequest
	);
};

const forwardNodeUpdate = pure<SendThreadContext, SendThreadEvent>(
	(ctx, evt) => {
		return raise({
			type: "nodeUpdate",
			result: (evt as any).message,
		});
	},
);

const forwardHandshakeResponse = pure<SendThreadContext, SendThreadEvent>(
	(ctx, evt) => {
		return raise({
			type: "handshakeResponse",
			result: (evt as any).message,
		});
	},
);

const every = (...guards: string[]) => ({
	type: "every",
	guards,
});
const guards: MachineOptions<SendThreadContext, SendThreadEvent>["guards"] = {
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
	requiresNoHandshake: (ctx) => {
		const msg = ctx.currentTransaction?.message;
		if (!(msg instanceof SendDataRequest)) {
			return true;
		}
		return !(msg.command as CommandClass).requiresPreTransmitHandshake();
	},
	isNotForActiveCurrentTransaction: (ctx, evt: any) =>
		!!ctx.currentTransaction && evt.transaction !== ctx.currentTransaction,
	isNotForActiveHandshakeTransaction: (ctx, evt: any, meta) =>
		// while in the handshake state, the handshake transaction has a priority
		(meta.state.matches("sending.handshake") ||
			!!ctx.handshakeTransaction) &&
		evt.transaction !== ctx.handshakeTransaction,
	expectsNodeUpdate: (ctx) =>
		ctx.currentTransaction?.message instanceof SendDataRequest &&
		(ctx.currentTransaction
			.message as SendDataRequest).command.expectsCCResponse(),
	isExpectedUpdate: (ctx, evt, meta) => {
		if (!meta.state.matches("sending.waitForUpdate")) return false;
		const sentMsg = ctx.currentTransaction!.message as SendDataRequest;
		const receivedMsg = (evt as any).message;
		return (
			receivedMsg instanceof ApplicationCommandRequest &&
			sentMsg.command.isExpectedCCResponse(receivedMsg.command)
		);
	},
	currentTransactionIsSendData,
	mayRetry: (ctx, evt: any) => {
		const msg = ctx.currentTransaction!.message;
		if (msg instanceof SendDataMulticastRequest) {
			// Don't try to resend multicast messages if they were already transmitted.
			// One or more nodes might have already reacted
			if (evt.reason === "callback NOK") {
				return false;
			}
		}
		return (
			(msg as SendDataRequest | SendDataMulticastRequest)
				.maxSendAttempts > ctx.sendDataAttempts
		);
	},

	// isSendDataSinglecast: (ctx) => {
	// 	const msg = ctx.currentTransaction?.message;
	// 	return msg instanceof SendDataRequest;
	// },
	/** Whether the message is an outgoing pre-transmit handshake */
	isPreTransmitHandshakeForCurrentTransaction: (ctx, evt, meta) => {
		if (!meta.state.matches("sending.handshake")) return false;

		const transaction = (evt as any).transaction as Transaction;
		if (transaction.priority !== MessagePriority.PreTransmitHandshake)
			return false;
		if (!(transaction.message instanceof SendDataRequest)) return false;
		const curCommand = (ctx.currentTransaction!.message as SendDataRequest)
			.command;
		const newCommand = (transaction.message as SendDataRequest).command;
		// require the handshake to be for the same node
		return newCommand.nodeId === curCommand.nodeId;
	},
	isExpectedHandshakeResponse: (ctx, evt, meta) => {
		if (!ctx.handshakeTransaction) return false;
		if (!meta.state.matches("sending.waitForUpdate")) return false;
		const sentMsg = ctx.handshakeTransaction.message as SendDataRequest;
		const receivedMsg = (evt as any).message;
		return (
			receivedMsg instanceof ApplicationCommandRequest &&
			sentMsg.command.isExpectedCCResponse(receivedMsg.command)
		);
	},
	/** Whether the message is an outgoing handshake response to the current node*/
	isHandshakeForCurrentTransaction: (ctx, evt) => {
		if (!ctx.currentTransaction) return false;
		const transaction = (evt as any).transaction as Transaction;
		if (transaction.priority !== MessagePriority.Handshake) return false;
		if (!(transaction.message instanceof SendDataRequest)) return false;
		const curCommand = (ctx.currentTransaction.message as SendDataRequest)
			.command;
		const newCommand = transaction.message.command;
		// require the handshake to be for the same node
		return newCommand.nodeId === curCommand.nodeId;
	},
	// queueContainsResponseToHandshakeRequest: (ctx) => {
	// 	const next = ctx.queue.peekStart();
	// 	return next?.priority === MessagePriority.Handshake;
	// },
	// isSendDataWithCallbackTimeout: (ctx, evt: any) => {
	// 	const msg = ctx.currentTransaction?.message;
	// 	return (
	// 		(msg instanceof SendDataRequest ||
	// 			msg instanceof SendDataMulticastRequest) &&
	// 		evt.data?.type === "failure" &&
	// 		evt.data?.reason === "callback timeout"
	// 	);
	// },
	// currentTransactionIsPingForNode: (ctx, evt) => {
	// 	const msg = ctx.currentTransaction?.message;
	// 	return (
	// 		!!msg &&
	// 		messageIsPing(msg) &&
	// 		msg.getNodeId() === (evt as any).nodeId
	// 	);
	// },
	// shouldNotKeepCurrentTransaction: (ctx, evt) => {
	// 	const reducer = (evt as any).reducer;
	// 	return (
	// 		reducer(ctx.currentTransaction, "current").type !==
	// 		"keep"
	// 	);
	// },
};

export function createSendThreadMachine(
	implementations: ServiceImplementations,
	initialContext: Partial<SendThreadContext> = {},
): SendThreadMachine {
	const resolveCurrentTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.resolveTransaction(ctx.currentTransaction!, evt.result);
		return ctx;
	});

	const rejectCurrentTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.rejectTransaction(
			ctx.currentTransaction!,
			sendDataErrorToZWaveError(
				evt.reason,
				ctx.currentTransaction!.message,
				evt.result,
			),
		);
		return ctx;
	});

	const rejectCurrentTransactionWithNodeTimeout: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx) => {
		implementations.rejectTransaction(
			ctx.currentTransaction!,
			sendDataErrorToZWaveError(
				"node timeout",
				ctx.currentTransaction!.message,
				undefined,
			),
		);
		return ctx;
	});

	const resolveHandshakeTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.resolveTransaction(
			ctx.handshakeTransaction!,
			evt.result,
		);
		return ctx;
	});

	const rejectHandshakeTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.rejectTransaction(
			ctx.handshakeTransaction!,
			sendDataErrorToZWaveError(
				evt.reason,
				ctx.handshakeTransaction!.message,
				evt.result,
			),
		);
		return ctx;
	});

	const rejectHandshakeTransactionWithNodeTimeout: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx) => {
		implementations.rejectTransaction(
			ctx.handshakeTransaction!,
			sendDataErrorToZWaveError(
				"node timeout",
				ctx.handshakeTransaction!.message,
				undefined,
			),
		);
		return ctx;
	});

	const resolveEventTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.resolveTransaction(evt.transaction, evt.result);
		return ctx;
	});

	const rejectEventTransaction: AssignAction<SendThreadContext, any> = assign(
		(ctx, evt) => {
			implementations.rejectTransaction(
				evt.transaction,
				sendDataErrorToZWaveError(
					evt.reason,
					evt.transaction.message,
					evt.result,
				),
			);
			return ctx;
		},
	);

	const ret = Machine<
		SendThreadContext,
		SendThreadStateSchema,
		SendThreadEvent
	>(
		{
			id: "SendThread",
			initial: "init",
			context: {
				commandQueue: undefined as any,
				queue: new SortedList(),
				sendDataAttempts: 0,
				...initialContext,
			},
			on: {
				// Forward low-level events to the command queue
				ACK: { actions: forwardToCommandQueue },
				CAN: { actions: forwardToCommandQueue },
				NAK: { actions: forwardToCommandQueue },
				message: [
					// For messages, check first if we expect them
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse,
					},
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
					},
					// else forward to the command queue aswell
					{ actions: forwardToCommandQueue },
				],
				// resolve/reject any un-interesting transactions if they are done
				command_success: [
					{
						cond: "isNotForActiveHandshakeTransaction",
						actions: resolveEventTransaction,
					},
					{
						cond: "isNotForActiveCurrentTransaction",
						actions: resolveEventTransaction,
					},
				],
				command_failure: [
					{
						cond: "isNotForActiveHandshakeTransaction",
						actions: rejectEventTransaction,
					},
					{
						cond: "isNotForActiveCurrentTransaction",
						actions: rejectEventTransaction,
					},
				],
				// handle newly added messages
				add: [
					// Trigger outgoing handshakes immediately without queueing
					{
						cond: "isPreTransmitHandshakeForCurrentTransaction",
						actions: [
							forwardToCommandQueue,
							// and inform the state machine when it is the one we've waited for
							assign({
								handshakeTransaction: (_, evt) =>
									evt.transaction,
							}),
						],
					},
					{
						cond: "isHandshakeForCurrentTransaction",
						actions: forwardToCommandQueue,
					},
					{
						actions: [
							assign({
								queue: (ctx, evt) => {
									ctx.queue.add(evt.transaction);
									return ctx.queue;
								},
							}),
							raise<SendThreadContext, any>("trigger"),
						],
					},
				],
			},
			states: {
				init: {
					entry: assign<SendThreadContext, any>({
						commandQueue: () =>
							spawn(createCommandQueueMachine(implementations)),
					}),
					// Spawn the command queue when starting the send thread
					always: "idle",
				},
				idle: {
					id: "idle",
					entry: [deleteCurrentTransaction, resetSendDataAttempts],
					always: [
						{ cond: "maySendFirstMessage", target: "sending" },
					],
					on: {
						trigger: [
							{
								cond: "maySendFirstMessage",
								target: "sending",
							},
						],
					},
				},
				sending: {
					// Use the first transaction in the queue as the current one
					entry: setCurrentTransaction,
					initial: "beforeSend",
					states: {
						beforeSend: {
							entry: [
								pure((ctx) =>
									currentTransactionIsSendData(ctx)
										? incrementSendDataAttempts
										: undefined,
								),
								deleteHandshakeTransaction,
							],
							always: [
								// Skip this step if no handshake is required
								{
									cond: "requiresNoHandshake",
									target: "execute",
								},
								// else begin the handshake process
								{
									target: "handshake",
								},
							],
						},
						handshake: {
							// Just send the handshake as a side effect
							invoke: {
								id: "kickOffPreTransmitHandshake",
								src: "kickOffPreTransmitHandshake",
							},
							on: {
								// On success, start waiting for the handshake response
								command_success: "waitForUpdate",
								command_failure: [
									// On failure, retry SendData commands if possible
									{
										cond: "mayRetry",
										actions: rejectHandshakeTransaction,
										target: "retryWait",
									},
									// Otherwise reject the transaction
									{
										actions: [
											rejectHandshakeTransaction,
											rejectCurrentTransaction,
										],
										target: "done",
									},
								],
							},
						},
						execute: {
							entry: deleteHandshakeTransaction,
							on: {
								command_success: [
									// On success, start waiting for an update
									{
										cond: "expectsNodeUpdate",
										target: "waitForUpdate",
									},
									// or resolve the current transaction if none is required
									{
										actions: resolveCurrentTransaction,
										target: "done",
									},
								],
								command_failure: [
									// On failure, retry SendData commands if possible
									{
										cond: every(
											"currentTransactionIsSendData",
											"mayRetry",
										),
										target: "retryWait",
									},
									// Otherwise reject the transaction
									{
										actions: rejectCurrentTransaction,
										target: "done",
									},
								],
							},
						},
						waitForUpdate: {
							on: {
								handshakeResponse: {
									actions: resolveHandshakeTransaction,
									target: "execute",
								},
								nodeUpdate: {
									actions: resolveCurrentTransaction,
									target: "done",
								},
							},
							after: {
								// If an update times out, retry if possible - otherwise reject the transaction
								1600: [
									{
										cond: "mayRetry",
										target: "retryWait",
										actions: pure((ctx) =>
											!!ctx.handshakeTransaction
												? rejectHandshakeTransactionWithNodeTimeout
												: undefined,
										),
									},
									{
										actions: pure<SendThreadContext, any>(
											(ctx) => {
												const ret = [
													rejectCurrentTransactionWithNodeTimeout,
												];
												if (
													!!ctx.handshakeTransaction
												) {
													ret.unshift(
														rejectHandshakeTransactionWithNodeTimeout,
													);
												}
												return ret;
											},
										),
										target: "done",
									},
								],
							},
						},
						retryWait: {
							invoke: {
								id: "notify",
								src: "notifyRetry",
							},
							after: {
								500: "beforeSend",
							},
						},
						done: {
							// Clean up the context after sending
							always: {
								target: "#idle",
								actions: [
									deleteCurrentTransaction,
									deleteHandshakeTransaction,
									resetSendDataAttempts,
								],
							},
						},
					},
				},
			},
		},
		{
			services: {
				kickOffPreTransmitHandshake: (ctx) => {
					// Execute the pre transmit handshake and swallow all errors
					(ctx.currentTransaction!.message as SendDataRequest).command
						.preTransmitHandshake()
						.catch(() => {
							// ignore
						});
					return Promise.resolve();
				},
				notifyRetry: (ctx) => {
					implementations.notifyRetry?.(
						"SendData",
						ctx.currentTransaction!.message,
						ctx.sendDataAttempts,
						(ctx.currentTransaction!.message as SendDataRequest)
							.maxSendAttempts,
						500,
					);
					return Promise.resolve();
				},
			},
			guards: {
				...guards,
				every: (ctx, event, { cond }) => {
					const keys = (cond as any).guards as string[];
					return keys.every((guardKey: string) =>
						guards[guardKey](ctx, event as any, undefined as any),
					);
				},
			},
		},
	);
	return ret;
}
