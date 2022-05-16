import { CommandClasses, ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { Message } from "@zwave-js/serial";
import { MessagePriority } from "@zwave-js/serial";
import { SortedList } from "alcalzone-shared/sorted-list";
import {
	Action,
	ActorRef,
	ActorRefFrom,
	assign,
	AssignAction,
	createMachine,
	forwardTo,
	Interpreter,
	MachineOptions,
	PureAction,
	spawn,
	StateMachine,
} from "xstate";
import { pure, raise, send, stop } from "xstate/lib/actions";
import { messageIsPing } from "../commandclass/NoOperationCC";
import { InterviewStage, NodeStatus } from "../node/_Types";
import {
	CommandQueueEvent,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import type {
	SerialAPICommandDoneData,
	SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";
import type { ServiceImplementations } from "./StateMachineShared";
import type { Transaction } from "./Transaction";
import {
	createTransactionMachine,
	TransactionMachine,
} from "./TransactionMachine";
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

export interface ActiveTransaction {
	transaction: Transaction;
	machine: ActorRefFrom<TransactionMachine>;
}

export interface SendThreadContext {
	queue: SortedList<Transaction>;
	commandQueue: ActorRef<any, any>;
	activeTransactions: Map<string, ActiveTransaction>;
	counter: number;
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
	| { type: "pause" | "unpause" }
	| {
			type: "forward";
			from: string;
			to: string;
			payload: any;
	  }
	| {
			type: "transaction_done";
			id: string;
	  };

export type SendThreadMachine = StateMachine<
	SendThreadContext,
	any,
	SendThreadEvent,
	any,
	any,
	any,
	any
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
	source: "queue" | "active",
) => TransactionReducerResult;

export type SendThreadMachineParams = {
	timeouts: SerialAPICommandMachineParams["timeouts"] &
		Pick<ZWaveOptions["timeouts"], "report">;
	attempts: SerialAPICommandMachineParams["attempts"];
};

const finalizeTransaction: PureAction<SendThreadContext, any> = pure(
	(ctx, evt: any) => [
		stop(evt.id),
		assign((ctx: SendThreadContext) => {
			// Pause the send thread if necessary
			const transaction = ctx.activeTransactions.get(evt.id)?.transaction;
			if (transaction?.pauseSendThread) ctx.paused = true;
			// Remove the last reference to the actor
			ctx.activeTransactions.delete(evt.id);
			return ctx;
		}) as any,
	],
);

const forwardToCommandQueue = forwardTo<any, any>((ctx) => ctx.commandQueue);

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

const guards: NonNullable<
	MachineOptions<SendThreadContext, SendThreadEvent>["guards"]
> = {
	mayStartTransaction: (ctx, evt: any, meta) => {
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
		// 2. Responses to nonce requests must be sent independent of the node status, because some sleeping nodes may try to send us encrypted messages.
		//    If we don't send them, they block the send queue
		// 3. Nodes that can sleep but do not support wakeup: https://github.com/zwave-js/node-zwave-js/discussions/1537
		//    We need to try and send messages to them even if they are asleep, because we might never hear from them

		// While the queue is busy, we may not start any transaction, except nonce responses to the node we're currently communicating with
		if (meta.state.matches("busy")) {
			if (nextTransaction.priority === MessagePriority.Nonce) {
				for (const active of ctx.activeTransactions.values()) {
					if (
						active.transaction.message.getNodeId() ===
						nextTransaction.message.getNodeId()
					) {
						return true;
					}
				}
			}
			return false;
		}

		// While not busy, always reply to nonce requests and Supervision Get requests
		if (
			nextTransaction.priority === MessagePriority.Nonce ||
			nextTransaction.priority === MessagePriority.Supervision
		) {
			return true;
		}
		// And send pings
		if (messageIsPing(message)) return true;
		// Or controller messages
		if (!targetNode) return true;

		return (
			targetNode.status !== NodeStatus.Asleep ||
			(!targetNode.supportsCC(CommandClasses["Wake Up"]) &&
				targetNode.interviewStage >= InterviewStage.NodeInfo)
		);
	},
	hasNoActiveTransactions: (ctx) => ctx.activeTransactions.size === 0,
};

export function createSendThreadMachine(
	implementations: ServiceImplementations,
	params: SendThreadMachineParams,
): SendThreadMachine {
	const notifyUnsolicited: Action<SendThreadContext, any> = (
		_: any,
		evt: any,
	) => {
		implementations.notifyUnsolicited(evt.message);
	};

	const reduce: PureAction<SendThreadContext, any> = pure((ctx, evt) => {
		const dropQueued: Transaction[] = [];
		const stopActive: Transaction[] = [];
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
					(source === "queue" ? dropQueued : stopActive).push(
						transaction,
					);
					break;
				case "requeue":
					if (reducerResult.priority != undefined) {
						transaction.priority = reducerResult.priority;
					}
					if (reducerResult.tag != undefined) {
						transaction.tag = reducerResult.tag;
					}
					if (source === "active") stopActive.push(transaction);
					requeue.push(transaction);
					break;
				case "resolve":
					implementations.resolveTransaction(
						transaction,
						reducerResult.message,
					);
					(source === "queue" ? dropQueued : stopActive).push(
						transaction,
					);
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
					(source === "queue" ? dropQueued : stopActive).push(
						transaction,
					);
					break;
			}
		};

		const { queue, activeTransactions } = ctx;

		for (const transaction of queue) {
			reduceTransaction(transaction, "queue");
		}

		for (const { transaction } of activeTransactions.values()) {
			reduceTransaction(transaction, "active");
		}

		// Now we know what to do with the transactions
		queue.remove(...dropQueued, ...requeue);
		queue.add(...requeue.map((t) => t.clone()));

		return [
			assign((ctx: SendThreadContext) => ({
				...ctx,
				queue,
			})),
			...stopActive.map((t) =>
				send<SendThreadContext, any, any>(
					{ type: "remove", transaction: t },
					{ to: ctx.commandQueue as any },
				),
			),
		];
	});

	const spawnTransaction: AssignAction<SendThreadContext, any> = assign(
		(ctx) => {
			const newCounter = (ctx.counter + 1) % 0xffffffff;
			const id = "T" + newCounter.toString(16).padStart(8, "0");
			const transaction = ctx.queue.shift()!;
			const machine = spawn(
				createTransactionMachine(id, transaction, implementations),
				{
					name: id,
				},
			);
			ctx.activeTransactions.set(id, { machine, transaction });
			return {
				...ctx,
				counter: newCounter,
			};
		},
	);

	const ret = createMachine<SendThreadContext, SendThreadEvent>(
		{
			id: "SendThread",
			initial: "init",
			preserveActionOrder: true,
			context: {
				commandQueue: undefined as any,
				queue: new SortedList(),
				activeTransactions: new Map(),
				counter: 0,
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

				// Forward NIFs to each transaction machine to resolve potential waiting pings
				NIF: {
					actions: pure((ctx, evt) => {
						const activeTransactionMachinesForNode = [
							...ctx.activeTransactions.values(),
						]
							.filter(
								({ transaction }) =>
									transaction.message.getNodeId() ===
									evt.nodeId,
							)
							.map((a) => a.machine.id);

						return [
							...activeTransactionMachinesForNode.map(
								(id) => send(evt, { to: id }) as any,
							),
							// Sort the send queue and evaluate again whether the next message may be sent
							sortQueue,
							raise("trigger") as any,
						];
					}),
				},

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
				reduce: {
					// Reducing may reorder the queue, so raise a trigger afterwards
					actions: [reduce, raise("trigger") as any],
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
						assign({ paused: () => false }),
						raise("trigger") as any,
					],
				},

				// forward events between child machinies
				forward: {
					actions: send(
						(_, evt) => ({ ...evt.payload, from: evt.from }),
						{
							to: (_, evt) => evt.to,
						},
					),
				},

				// Stop transactions when they are done
				transaction_done: {
					actions: [finalizeTransaction, raise("trigger") as any],
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
									name: "QUEUE",
								},
							),
					}),
					// Spawn the command queue when starting the send thread
					always: "idle",
				},
				// While idle, any transaction may be started
				idle: {
					id: "idle",

					always: {
						cond: "mayStartTransaction",
						// Use the first transaction in the queue as the current one
						actions: spawnTransaction,
						target: "busy",
					},
					on: {
						// On trigger, re-evaluate the conditions to enter "busy"
						trigger: { target: "idle" },
					},
				},
				// While busy, only nonces may be sent
				busy: {
					id: "busy",
					always: [
						{
							cond: "hasNoActiveTransactions",
							target: "idle",
						},
						{
							cond: "mayStartTransaction",
							// Use the first transaction in the queue as the current one
							actions: spawnTransaction,
							target: "busy",
						},
					],
					on: {
						// On trigger, re-evaluate the conditions to go spawn transactions or back to idle
						trigger: { target: "busy" },
					},
				},
			},
		},
		{
			guards: {
				...guards,
				every: (ctx, event, { cond }) => {
					const keys = (cond as any).guards as string[];
					return keys.every((guardKey: string) =>
						guards[guardKey]?.(ctx, event, undefined as any),
					);
				},
			},
		},
	);
	return ret;
}
