import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { SortedList } from "alcalzone-shared/sorted-list";
import {
	Action,
	assign,
	AssignAction,
	forwardTo,
	Interpreter,
	Machine,
	MachineOptions,
	spawn,
	StateMachine,
} from "xstate";
import { pure, raise, send } from "xstate/lib/actions";
import type { CommandClass } from "../commandclass/CommandClass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { messageIsPing } from "../commandclass/NoOperationCC";
import { ApplicationCommandRequest } from "../controller/ApplicationCommandRequest";
import { BridgeApplicationCommandRequest } from "../controller/BridgeApplicationCommandRequest";
import {
	SendDataBridgeRequest,
	SendDataMulticastBridgeRequest,
} from "../controller/SendDataBridgeMessages";
import {
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import { isSendData } from "../controller/SendDataShared";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { InterviewStage, NodeStatus } from "../node/Types";
import {
	CommandQueueEvent,
	CommandQueueInterpreter,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import type {
	SerialAPICommandDoneData,
	SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";
import {
	sendDataErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";
import type { ZWaveOptions } from "./ZWaveOptions";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		init: {};
		idle: {};
		sending: {
			states: {
				beforeSend: {};
				handshake: {
					states: {
						waitForCommandResult: {};
						waitForHandshakeResponse: {};
					};
				};
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
			result: ApplicationCommandRequest | BridgeApplicationCommandRequest;
	  }
	| {
			type: "handshakeResponse";
			result: ApplicationCommandRequest | BridgeApplicationCommandRequest;
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
			(
				| { type: "command_success" }
				| { type: "command_failure" }
				| { type: "command_error" }
			))
	| ({ type: "active_command_success" } & Omit<
			CommandQueueEvent & { type: "command_success" },
			"type"
	  >)
	| ({ type: "active_command_failure" } & Omit<
			CommandQueueEvent & { type: "command_failure" },
			"type"
	  >)
	| ({ type: "active_command_error" } & Omit<
			CommandQueueEvent & { type: "command_error" },
			"type"
	  >);

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
			// Resolve the transaction with the given message
			type: "resolve";
			message?: Message;
	  }
	| {
			// Changes the priority (and tag) of the transaction if a new one is given,
			// and moves the current transaction back to the queue
			type: "requeue";
			priority?: MessagePriority;
			tag?: any;
	  };

export type TransactionReducer = (
	transaction: Transaction,
	source: "queue" | "current",
) => TransactionReducerResult;

export type SendThreadMachineParams = {
	timeouts: SerialAPICommandMachineParams["timeouts"] &
		Pick<ZWaveOptions["timeouts"], "report">;
	attempts: SerialAPICommandMachineParams["attempts"] &
		Pick<ZWaveOptions["attempts"], "retryAfterTransmitReport">;
};

// These actions must be assign actions or they will be executed out of order

const setCurrentTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx) => {
		const queue = ctx.queue;
		const next = ctx.queue.shift()!;
		return {
			...ctx,
			queue,
			currentTransaction: next,
		};
	},
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

const currentTransactionIsSendData = (ctx: SendThreadContext) =>
	isSendData(ctx.currentTransaction?.message);

const forwardNodeUpdate = pure<SendThreadContext, any>((ctx, evt) => {
	return raise({
		type: "nodeUpdate",
		result: evt.message,
	});
});

const forwardHandshakeResponse = pure<SendThreadContext, any>((ctx, evt) => {
	return raise({
		type: "handshakeResponse",
		result: evt.message,
	});
});

const forwardActiveCommandSuccess = pure<SendThreadContext, any>((ctx, evt) => {
	return raise({ ...evt, type: "active_command_success" });
});

const forwardActiveCommandFailure = pure<SendThreadContext, any>((ctx, evt) => {
	return raise({ ...evt, type: "active_command_failure" });
});

const forwardActiveCommandError = pure<SendThreadContext, any>((ctx, evt) => {
	return raise({ ...evt, type: "active_command_error" });
});

const sendCurrentTransactionToCommandQueue = send<SendThreadContext, any>(
	(ctx) => ({
		type: "add",
		transaction: ctx.currentTransaction,
	}),
	{ to: (ctx) => ctx.commandQueue as any },
);

const resetCommandQueue = send<SendThreadContext, any>("reset", {
	to: (ctx) => ctx.commandQueue as any,
});

const sortQueue: AssignAction<SendThreadContext, any> = assign({
	queue: (ctx) => {
		const queue = ctx.queue;
		const items = [...queue];
		queue.clear();
		// Since the send queue is a sorted list, sorting is done on insert/add
		queue.add(...items);
		return queue;
	},
});

const every = (...guards: string[]) => ({
	type: "every",
	guards,
});
const guards: MachineOptions<SendThreadContext, SendThreadEvent>["guards"] = {
	maySendFirstMessage: (ctx) => {
		const nextTransaction = ctx.queue.peekStart();
		// We can't send anything if the queue is empty
		if (!nextTransaction) return false;

		const message = nextTransaction.message;
		const targetNode = message.getNodeUnsafe();

		// The send queue is sorted automatically. If the first message is for a sleeping node, all messages in the queue are.
		// There are a few exceptions:
		// 1. Pings may be used to determine whether a node is really asleep.
		// 2. Responses to handshake requests must always be sent, because some sleeping nodes may try to send us encrypted messages.
		//    If we don't send them, they block the send queue
		// 3. Nodes that can sleep but do not support wakeup: https://github.com/zwave-js/node-zwave-js/discussions/1537
		//    We need to try and send messages to them even if they are asleep, because we might never hear from them

		return (
			!targetNode ||
			targetNode.status !== NodeStatus.Asleep ||
			(!targetNode.supportsCC(CommandClasses["Wake Up"]) &&
				targetNode.interviewStage >= InterviewStage.NodeInfo) ||
			messageIsPing(message) ||
			nextTransaction.priority === MessagePriority.Handshake
		);
	},
	requiresNoHandshake: (ctx) => {
		const msg = ctx.currentTransaction?.message;
		if (
			msg instanceof SendDataRequest ||
			msg instanceof SendDataBridgeRequest
		) {
			return !(msg.command as CommandClass).requiresPreTransmitHandshake();
		}
		return true;
	},
	isForActiveTransaction: (ctx, evt: any, meta) => {
		return (
			((meta.state.matches("sending.handshake") ||
				!!ctx.handshakeTransaction) &&
				evt.transaction === ctx.handshakeTransaction) ||
			((meta.state.matches("sending.execute") ||
				meta.state.matches("sending.waitForUpdate") ||
				!!ctx.currentTransaction) &&
				evt.transaction === ctx.currentTransaction)
		);
	},
	expectsNodeUpdate: (ctx) => {
		const msg = ctx.currentTransaction?.message;
		if (
			msg instanceof SendDataRequest ||
			msg instanceof SendDataBridgeRequest
		) {
			return (msg.command as CommandClass).expectsCCResponse();
		}
		return false;
	},
	isExpectedUpdate: (ctx, evt, meta) => {
		if (!meta.state.matches("sending.waitForUpdate")) return false;
		const sentMsg = ctx.currentTransaction!.message as
			| SendDataRequest
			| SendDataBridgeRequest;
		const receivedMsg = (evt as any).message;
		return (
			(receivedMsg instanceof ApplicationCommandRequest ||
				receivedMsg instanceof BridgeApplicationCommandRequest) &&
			sentMsg.command.isExpectedCCResponse(receivedMsg.command)
		);
	},
	currentTransactionIsSendData,
	mayRetry: (ctx, evt: any) => {
		const msg = ctx.currentTransaction!.message;
		if (!isSendData(msg)) return false;
		if (
			msg instanceof SendDataMulticastRequest ||
			msg instanceof SendDataMulticastBridgeRequest
		) {
			// Don't try to resend multicast messages if they were already transmitted.
			// One or more nodes might have already reacted
			if (evt.reason === "callback NOK") {
				return false;
			}
		}
		return msg.maxSendAttempts > ctx.sendDataAttempts;
	},

	/** Whether the message is an outgoing pre-transmit handshake */
	isPreTransmitHandshakeForCurrentTransaction: (ctx, evt, meta) => {
		if (!meta.state.matches("sending.handshake")) return false;
		// Ensure that the current transaction is SendData
		if (!currentTransactionIsSendData(ctx)) return false;

		const transaction = (evt as any).transaction as Transaction;
		if (transaction.priority !== MessagePriority.PreTransmitHandshake)
			return false;
		if (
			transaction.message instanceof SendDataRequest ||
			transaction.message instanceof SendDataBridgeRequest
		) {
			// require the handshake to be for the same node
			return (
				transaction.message.command.nodeId ===
				(ctx.currentTransaction!.message as
					| SendDataRequest
					| SendDataBridgeRequest).command.nodeId
			);
		}
		return false;
	},
	isExpectedHandshakeResponse: (ctx, evt, meta) => {
		if (!ctx.handshakeTransaction) return false;
		if (!meta.state.matches("sending.handshake.waitForHandshakeResponse"))
			return false;
		const sentMsg = ctx.handshakeTransaction.message as
			| SendDataRequest
			| SendDataBridgeRequest;
		const receivedMsg = (evt as any).message;
		if (!isCommandClassContainer(receivedMsg)) return false;
		return (
			(receivedMsg instanceof ApplicationCommandRequest ||
				receivedMsg instanceof BridgeApplicationCommandRequest) &&
			sentMsg.command.isExpectedCCResponse(receivedMsg.command)
		);
	},
	/** Whether the message is an outgoing handshake response to the current node*/
	isHandshakeForCurrentTransaction: (ctx, evt) => {
		// First ensure that the current transaction is SendData
		if (!currentTransactionIsSendData(ctx)) return false;
		// Then ensure that the event transaction is also SendData
		const transaction = (evt as any).transaction as Transaction;
		if (transaction.priority !== MessagePriority.Handshake) return false;
		if (
			transaction.message instanceof SendDataRequest ||
			transaction.message instanceof SendDataBridgeRequest
		) {
			// require the handshake to be for the same node
			return (
				transaction.message.command.nodeId ===
				(ctx.currentTransaction!.message as
					| SendDataRequest
					| SendDataBridgeRequest).command.nodeId
			);
		}
		return false;
	},
	shouldNotKeepCurrentTransaction: (ctx, evt) => {
		const reducer = (evt as any).reducer;
		return reducer(ctx.currentTransaction, "current").type !== "keep";
	},
	currentTransactionIsPingForNode: (ctx, evt) => {
		const msg = ctx.currentTransaction?.message;
		return (
			!!msg &&
			messageIsPing(msg) &&
			msg.getNodeId() === (evt as any).nodeId
		);
	},
};

function createMessageDroppedUnexpectedError(original: Error): ZWaveError {
	const ret = new ZWaveError(
		`Message dropped because of an unexpected error: ${original.message}`,
		ZWaveErrorCodes.Controller_MessageDropped,
	);
	if (original.stack) ret.stack = original.stack;
	return ret;
}

export function createSendThreadMachine(
	implementations: ServiceImplementations,
	params: SendThreadMachineParams,
): SendThreadMachine {
	const resolveCurrentTransaction: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.resolveTransaction(ctx.currentTransaction!, evt.result);
		return ctx;
	});
	const resolveCurrentTransactionWithoutMessage: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx) => {
		implementations.resolveTransaction(ctx.currentTransaction!, undefined);
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
				ctx.currentTransaction!,
				evt.result,
			),
		);
		return ctx;
	});

	const rejectCurrentTransactionWithError: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.rejectTransaction(
			ctx.currentTransaction!,
			createMessageDroppedUnexpectedError(evt.error),
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
				ctx.currentTransaction!,
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
				ctx.handshakeTransaction!,
				evt.result,
			),
		);
		return ctx;
	});

	const rejectHandshakeTransactionWithError: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.rejectTransaction(
			ctx.handshakeTransaction!,
			createMessageDroppedUnexpectedError(evt.error),
		);
		return ctx;
	});

	const rejectHandshakeTransactionWithNodeTimeout: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx) => {
		const hsTransaction = ctx.handshakeTransaction;
		if (hsTransaction) {
			implementations.rejectTransaction(
				hsTransaction,
				sendDataErrorToZWaveError(
					"node timeout",
					hsTransaction,
					undefined,
				),
			);
		}
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

	const rejectEventTransactionWithError: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx, evt) => {
		implementations.rejectTransaction(
			evt.transaction,
			createMessageDroppedUnexpectedError(evt.error),
		);
		return ctx;
	});

	const notifyUnsolicited: Action<SendThreadContext, any> = (
		_: any,
		evt: any,
	) => {
		implementations.notifyUnsolicited(evt.message);
	};

	const reduce: AssignAction<SendThreadContext, any> = assign({
		queue: (ctx, evt) => {
			const { queue, currentTransaction } = ctx;

			const drop: Transaction[] = [];
			const requeue: Transaction[] = [];

			const reduceTransaction: (
				...args: Parameters<TransactionReducer>
			) => void = (transaction, source) => {
				const reducerResult = (evt as SendThreadEvent & {
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
						if (reducerResult.tag != undefined) {
							transaction.tag = reducerResult.tag;
						}
						requeue.push(transaction);
						break;
					case "resolve":
						implementations.resolveTransaction(
							transaction,
							reducerResult.message,
						);
						drop.push(transaction);
						break;
					case "reject":
						implementations.rejectTransaction(
							transaction,
							new ZWaveError(
								reducerResult.message,
								reducerResult.code,
								undefined,
								transaction.stack,
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
			},
			on: {
				// Forward low-level events and unidentified messages to the command queue
				ACK: { actions: forwardToCommandQueue },
				CAN: { actions: forwardToCommandQueue },
				NAK: { actions: forwardToCommandQueue },
				// messages may come back as "unsolicited", these might be expected updates
				// we need to run them through the serial API machine to avoid mismatches
				message: { actions: forwardToCommandQueue },
				// resolve/reject any un-interesting transactions if they are done
				command_success: [
					// If this notification belongs to an active command, forward it
					{
						cond: "isForActiveTransaction",
						actions: forwardActiveCommandSuccess,
					},
					// otherwise just resolve it
					{
						actions: resolveEventTransaction,
					},
				],
				command_failure: [
					// If this notification belongs to an active command, forward it
					{
						cond: "isForActiveTransaction",
						actions: forwardActiveCommandFailure,
					},
					// otherwise just reject it
					{
						actions: rejectEventTransaction,
					},
				],
				command_error: [
					// If this notification belongs to an active command, forward it
					{
						cond: "isForActiveTransaction",
						actions: forwardActiveCommandError,
					},
					// otherwise just reject it
					{
						actions: rejectEventTransactionWithError,
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
					// Forward all handshake messages that could have to do with the current transaction
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
							raise("trigger") as any,
						],
					},
				],
				unsolicited: [
					// If a message is returned by the serial API, they might be an expected node update
					{
						cond: "isExpectedHandshakeResponse",
						actions: forwardHandshakeResponse,
					},
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
					},
					// Return unsolicited messages to the driver
					{ actions: notifyUnsolicited },
				],
				// Accept external commands to sort the queue
				sortQueue: {
					actions: [sortQueue, raise("trigger") as any],
				},
			},
			states: {
				init: {
					entry: assign<SendThreadContext, any>({
						commandQueue: () =>
							spawn(
								createCommandQueueMachine(
									implementations,
									params,
								),
								{
									name: "commandQueue",
								},
							) as any,
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
						reduce: {
							// Reducing may reorder the queue, so raise a trigger afterwards
							actions: [reduce, raise("trigger") as any],
						},
					},
				},
				sending: {
					id: "sending",
					// Use the first transaction in the queue as the current one
					entry: setCurrentTransaction,
					initial: "beforeSend",
					on: {
						NIF: {
							// Pings are not retransmitted and won't receive a response if the node wake up after the ping was sent
							// Therefore resolve pending pings so the communication may proceed immediately
							cond: "currentTransactionIsPingForNode",
							actions: [
								resolveCurrentTransactionWithoutMessage,
								// TODO:
								// this.driver.controllerLog.logNode(
								// 	node.id,
								// 	`Treating the node info as a successful ping...`,
								// );
							],
							target: "sending.done",
							internal: true,
						},
						reduce: [
							// If the current transaction should not be kept, tell the send queue to abort it and go back to idle
							{
								cond: "shouldNotKeepCurrentTransaction",
								actions: [resetCommandQueue, reduce],
								target: "sending.done",
								internal: true,
							},
							{ actions: reduce },
						],
					},
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
								id: "preTransmitHandshake",
								src: "preTransmitHandshake",
								onDone: "#sending.execute",
							},
							initial: "waitForCommandResult",
							on: {
								handshakeResponse: {
									actions: resolveHandshakeTransaction,
								},
							},
							states: {
								// After kicking off the command, wait until it is completed
								waitForCommandResult: {
									on: {
										// On success, start waiting for the handshake response
										active_command_success:
											"waitForHandshakeResponse",
										active_command_failure: [
											// On failure, retry SendData commands if possible
											{
												cond: "mayRetry",
												actions: rejectHandshakeTransaction,
												target: "#sending.retryWait",
											},
											// Otherwise reject the transaction
											{
												actions: [
													rejectHandshakeTransaction,
													rejectCurrentTransaction,
												],
												target: "#sending.done",
											},
										],
										active_command_error: [
											// On failure, retry SendData commands if possible
											{
												cond: "mayRetry",
												actions: rejectHandshakeTransactionWithError,
												target: "#sending.retryWait",
											},
											// Otherwise reject the transaction
											{
												actions: [
													rejectHandshakeTransactionWithError,
													rejectCurrentTransactionWithError,
												],
												target: "#sending.done",
											},
										],
									},
								},
								waitForHandshakeResponse: {
									after: {
										// If an update times out, retry if possible - otherwise reject the entire transaction
										REPORT_TIMEOUT: [
											// only retry on timeout when configured
											...(params.attempts
												.retryAfterTransmitReport
												? [
														{
															cond: "mayRetry",
															target:
																"#sending.retryWait",
															actions: rejectHandshakeTransactionWithNodeTimeout,
														},
												  ]
												: []),
											{
												actions: [
													rejectHandshakeTransactionWithNodeTimeout,
													rejectCurrentTransactionWithNodeTimeout,
												],
												target: "#sending.done",
											},
										],
									},
								},
							},
						},
						execute: {
							entry: [
								deleteHandshakeTransaction,
								sendCurrentTransactionToCommandQueue,
							],
							on: {
								active_command_success: [
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
								active_command_failure: [
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
								active_command_error: [
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
										actions: rejectCurrentTransactionWithError,
										target: "done",
									},
								],
							},
						},
						waitForUpdate: {
							on: {
								nodeUpdate: {
									actions: resolveCurrentTransaction,
									target: "done",
								},
							},
							after: {
								// If an update times out, retry if possible - otherwise reject the transaction
								REPORT_TIMEOUT: [
									// only retry on timeout when configured
									...(params.attempts.retryAfterTransmitReport
										? [
												{
													cond: "mayRetry",
													target: "retryWait",
												},
										  ]
										: []),
									{
										actions: rejectCurrentTransactionWithNodeTimeout,
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
				preTransmitHandshake: async (ctx) => {
					// Execute the pre transmit handshake and swallow all errors
					try {
						await (ctx.currentTransaction!.message as
							| SendDataRequest
							| SendDataBridgeRequest).command.preTransmitHandshake();
					} catch (e) {}
				},
				notifyRetry: (ctx) => {
					implementations.notifyRetry?.(
						"SendData",
						undefined,
						ctx.currentTransaction!.message,
						ctx.sendDataAttempts,
						(ctx.currentTransaction!.message as
							| SendDataRequest
							| SendDataBridgeRequest).maxSendAttempts,
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
						guards[guardKey](ctx, event, undefined as any),
					);
				},
			},
			delays: {
				REPORT_TIMEOUT: params.timeouts.report,
			},
		},
	);
	return ret;
}
