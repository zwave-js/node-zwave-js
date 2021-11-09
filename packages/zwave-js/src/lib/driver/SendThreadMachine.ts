import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { SortedList } from "alcalzone-shared/sorted-list";
import {
	Action,
	assign,
	AssignAction,
	createMachine,
	forwardTo,
	Interpreter,
	MachineOptions,
	spawn,
	StateMachine,
} from "xstate";
import { pure, raise, send } from "xstate/lib/actions";
import { messageIsPing } from "../commandclass/NoOperationCC";
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
	messageGenerator?: ReturnType<Transaction["parts"]["start"]>;
	sendDataAttempts: number;
	paused: boolean;
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" }
	| { type: "unsolicited"; message: Message }
	| { type: "sortQueue" }
	| { type: "NIF"; nodeId: number }
	// Execute the given reducer function for each transaction in the queue
	// and the current transaction and react accordingly. The reducer must not have
	// side-effects because it may be executed multiple times for each transaction
	| { type: "reduce"; reducer: TransactionReducer }
	// Re-transmit the current transaction immediately
	| { type: "resend" }
	// Finalize the current transaction
	| { type: "finalize" }
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
	  >)
	| { type: "pause" | "unpause" };

export type SendThreadMachine = StateMachine<
	SendThreadContext,
	any,
	SendThreadEvent
>;
export type SendThreadInterpreter = Interpreter<
	SendThreadContext,
	any,
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
			// Whether the entire transaction should be rejected or just the current partial
			completely?: boolean;
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

const nextTransaction: AssignAction<SendThreadContext, any> = assign((ctx) => {
	const queue = ctx.queue;
	const next = ctx.queue.shift()!;
	return {
		...ctx,
		queue,
		currentTransaction: next,
	};
});

const startTransaction: AssignAction<SendThreadContext, any> = assign({
	messageGenerator: (ctx) => ctx.currentTransaction!.parts.start(),
});

const deleteCurrentTransaction: AssignAction<SendThreadContext, any> = assign({
	currentTransaction: (_) => undefined,
	messageGenerator: (_) => undefined,
});

const resetSendDataAttempts: AssignAction<SendThreadContext, any> = assign({
	sendDataAttempts: (_) => 0,
});

const incrementSendDataAttempts: AssignAction<SendThreadContext, any> = assign({
	sendDataAttempts: (ctx) => ctx.sendDataAttempts + 1,
});

const forwardToCommandQueue = forwardTo<any, any>((ctx) => ctx.commandQueue);

const maybePauseSendThread: AssignAction<SendThreadContext, any> = assign({
	paused: (ctx) => !!ctx.currentTransaction?.pauseSendThread,
});

const currentMessageIsSendData = (ctx: SendThreadContext) =>
	isSendData(ctx.currentTransaction?.parts.current?.message);

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
	mayStartTransaction: (ctx) => {
		// We may not send anything if the send thread is paused
		if (ctx.paused) return false;
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
	isForActiveTransaction: (ctx, evt: any, meta) => {
		return (
			(meta.state.matches("sending.execute") ||
				!!ctx.currentTransaction) &&
			evt.transaction === ctx.currentTransaction
		);
	},
	currentMessageIsSendData,
	hasMessage: (ctx: SendThreadContext) =>
		!!ctx.currentTransaction?.parts.current,
	mayRetry: (ctx, evt: any) => {
		const msg = ctx.currentTransaction?.parts.current?.message;
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

	shouldNotKeepCurrentTransaction: (ctx, evt) => {
		const reducer = (evt as any).reducer;
		return reducer(ctx.currentTransaction, "current").type !== "keep";
	},
	currentTransactionIsPingForNode: (ctx, evt) => {
		const msg = ctx.currentTransaction?.parts.current?.message;
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
	const resolveCurrentMessage: AssignAction<SendThreadContext, any> = assign(
		(ctx, evt) => {
			implementations.resolveTransaction(
				ctx.currentTransaction!,
				evt.result,
			);
			return ctx;
		},
	);
	const resolveCurrentMessageWithoutResult: AssignAction<
		SendThreadContext,
		any
	> = assign((ctx) => {
		implementations.resolveTransaction(ctx.currentTransaction!, undefined);
		return ctx;
	});

	const rejectCurrentMessage: AssignAction<SendThreadContext, any> = assign(
		(ctx, evt) => {
			implementations.rejectTransaction(
				ctx.currentTransaction!,
				sendDataErrorToZWaveError(
					evt.reason,
					ctx.currentTransaction!,
					evt.result,
				),
			);
			return ctx;
		},
	);

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

	const resolveEventTransaction: AssignAction<SendThreadContext, any> =
		assign((ctx, evt) => {
			// TODO: Think if pausing the send thread here is necessary
			if (evt.transaction.pauseSendThread) {
				ctx.paused = true;
			}
			implementations.resolveTransaction(evt.transaction, evt.result);
			return ctx;
		});

	const rejectEventTransaction: AssignAction<SendThreadContext, any> = assign(
		(ctx, evt) => {
			implementations.rejectTransaction(
				evt.transaction,
				sendDataErrorToZWaveError(
					evt.reason,
					evt.transaction,
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
				const reducerResult = (
					evt as SendThreadEvent & {
						type: "reduce";
					}
				).reducer(transaction, source);
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
							// It doesn't make sense to reject a partial transaction through a reducer
							true,
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

	const ret = createMachine<SendThreadContext, SendThreadEvent>(
		{
			id: "SendThread",
			initial: "init",
			preserveActionOrder: true,
			context: {
				commandQueue: undefined as any,
				queue: new SortedList(),
				sendDataAttempts: 0,
				paused: false,
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
				add: {
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
				// Return unsolicited messages to the driver
				unsolicited: {
					actions: notifyUnsolicited,
				},
				// Accept external commands to sort the queue
				sortQueue: {
					actions: [sortQueue, raise("trigger") as any],
				},
				// Accept external commands to pause/unpause the send queue
				pause: {
					actions: [assign({ paused: () => true }) as any],
				},
				unpause: {
					actions: [
						assign({ paused: () => false }) as any,
						raise("trigger") as any,
					],
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
					always: [
						{
							cond: "mayStartTransaction",
							// Use the first transaction in the queue as the current one
							actions: nextTransaction,
							target: "sending",
						},
					],
					on: {
						// On trigger, re-evaluate the conditions to enter "sending"
						trigger: { target: "idle" },
						reduce: {
							// Reducing may reorder the queue, so raise a trigger afterwards
							actions: [reduce, raise("trigger") as any],
						},
					},
				},
				// The sending state encapsulates an entire transaction
				sending: {
					id: "sending",
					// When entering this state, start or restart the transaction's message generator
					entry: startTransaction,
					initial: "nextMessage",
					on: {
						NIF: {
							// Pings are not retransmitted and won't receive a response if the node wake up after the ping was sent
							// Therefore resolve pending pings so the communication may proceed immediately
							cond: "currentTransactionIsPingForNode",
							actions: [
								resolveCurrentMessageWithoutResult,
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
					// The substates of "sending" are repeated for every message in this transaction
					states: {
						nextMessage: {
							invoke: {
								// The message generator asynchronously generates a new message to send
								// or undefined if it has reached the end. Invoking this promise doubles
								// as waiting for the node response without introducing additional states
								id: "nextMessage",
								src: (ctx) => ctx.messageGenerator!.next(),
								onDone: [
									{
										cond: "hasMessage",
										target: "attemptMessage",
										// Each newly generated message gets its own sendData attempts
										actions: resetSendDataAttempts,
									},
									// When the transaction generator is empty, we're done with this transaction
									{ target: "done" },
								],
								// If the next message cannot be generated, assume the transaction is done
								onError: { target: "done" },
							},
						},
						// Increase send data counter before sending the message
						attemptMessage: {
							entry: pure((ctx) =>
								currentMessageIsSendData(ctx)
									? incrementSendDataAttempts
									: undefined,
							),
							always: { target: "execute" },
						},
						execute: {
							entry: [sendCurrentTransactionToCommandQueue],
							on: {
								active_command_success: [
									// On success, resolve the transaction and wait for the driver's GO for the next one
									{
										actions: resolveCurrentMessage,
										target: "nextMessage",
									},
								],
								active_command_failure: [
									// On failure, retry SendData commands if possible
									{
										cond: every(
											"currentMessageIsSendData",
											"mayRetry",
										),
										target: "retryWait",
									},
									// Otherwise reject the transaction
									{
										actions: rejectCurrentMessage,
										target: "nextMessage",
									},
								],
								active_command_error: [
									// On failure, retry SendData commands if possible
									{
										cond: every(
											"currentMessageIsSendData",
											"mayRetry",
										),
										target: "retryWait",
									},
									// Otherwise reject the transaction
									{
										actions:
											rejectCurrentTransactionWithError,
										target: "nextMessage",
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
								500: "attemptMessage",
							},
						},
						done: {
							// Clean up the context after sending
							always: {
								target: "#idle",
								actions: [
									maybePauseSendThread,
									deleteCurrentTransaction,
								],
							},
						},
					},
				},
			},
		},
		{
			services: {
				notifyRetry: (ctx) => {
					const msg = ctx.currentTransaction!.getCurrentMessage() as
						| SendDataRequest
						| SendDataBridgeRequest;
					implementations.notifyRetry?.(
						"SendData",
						undefined,
						msg,
						ctx.sendDataAttempts,
						msg.maxSendAttempts,
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
