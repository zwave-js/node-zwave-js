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
	serialAPIOrSendDataErrorToZWaveError,
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
	preTransmitHandshakeTransaction?: Transaction;
	sendDataAttempts: number;
	sendDataErrorData?: SendDataErrorData;
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" | "preTransmitHandshake" }
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

const resolveCurrentTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx, evt) => {
		ctx.currentTransaction!.promise.resolve(evt.result);
		return ctx;
	},
);

// const resolveCurrentTransactionWithMessage: AssignAction<
// 	SendThreadContext,
// 	any
// > = assign((ctx, evt) => {
// 	ctx.currentTransaction!.promise.resolve(evt.message);
// 	return ctx;
// });

// const resolveCurrentTransactionWithoutMessage: AssignAction<
// 	SendThreadContext,
// 	any
// > = assign((ctx) => {
// 	ctx.currentTransaction!.promise.resolve();
// 	return ctx;
// });

const rejectCurrentTransaction: AssignAction<SendThreadContext, any> = assign(
	(ctx, evt) => {
		ctx.currentTransaction!.promise.reject(
			serialAPIOrSendDataErrorToZWaveError(
				evt.reason,
				ctx.currentTransaction!.message,
				evt.result,
			),
		);
		return ctx;
	},
);

const rejectCurrentTransactionWithNodeTimeout: AssignAction<
	SendThreadContext,
	any
> = assign((ctx) => {
	ctx.currentTransaction!.promise.reject(
		serialAPIOrSendDataErrorToZWaveError(
			"node timeout",
			ctx.currentTransaction!.message,
			undefined,
		),
	);
	return ctx;
});

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
	// executeSuccessful: (_, evt: any) => evt.data.type === "success",
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

	// isSendDataSinglecast: (ctx) => {
	// 	const msg = ctx.currentTransaction?.message;
	// 	return msg instanceof SendDataRequest;
	// },
	// isPreTransmitHandshakeForCurrentTransaction: (
	// 	ctx,
	// 	evt,
	// 	meta,
	// ) => {
	// 	if (!meta.state.matches(waitForTriggerStateId))
	// 		return false;

	// 	const transaction = (evt as any).transaction as Transaction;
	// 	if (
	// 		transaction.priority !==
	// 		MessagePriority.PreTransmitHandshake
	// 	)
	// 		return false;
	// 	if (!(transaction.message instanceof SendDataRequest))
	// 		return false;
	// 	const curCommand = (ctx.currentTransaction!
	// 		.message as SendDataRequest).command;
	// 	const newCommand = (transaction.message as SendDataRequest)
	// 		.command;
	// 	// require the handshake to be for the same node
	// 	return newCommand.nodeId === curCommand.nodeId;
	// },
	// isExpectedHandshakeResponse: (ctx, evt, meta) => {
	// 	if (!meta.state.matches(waitForHandshakeResponseStateId))
	// 		return false;
	// 	const sentMsg = ctx.preTransmitHandshakeTransaction!
	// 		.message as SendDataRequest;

	// 	const receivedMsg = (evt as any).message;
	// 	return (
	// 		receivedMsg instanceof ApplicationCommandRequest &&
	// 		sentMsg.command.isExpectedCCResponse(
	// 			receivedMsg.command,
	// 		)
	// 	);
	// },
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
	// mayRetry: (ctx) => {
	// 	const msg = ctx.currentTransaction!.message;
	// 	if (msg instanceof SendDataMulticastRequest) {
	// 		// Don't try to resend multicast messages if they were already transmitted.
	// 		// One or more nodes might have already reacted
	// 		if (ctx.sendDataErrorData!.reason === "callback NOK") {
	// 			return false;
	// 		}
	// 	}
	// 	return (
	// 		(msg as SendDataRequest | SendDataMulticastRequest)
	// 			.maxSendAttempts > ctx.sendDataAttempts
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
				ACK: {
					actions: forwardToCommandQueue,
				},
				CAN: {
					actions: forwardToCommandQueue,
				},
				NAK: {
					actions: forwardToCommandQueue,
				},
				message: [
					{
						cond: "isExpectedUpdate",
						actions: forwardNodeUpdate,
					},
					{
						actions: forwardToCommandQueue,
					},
				],
				// handle newly added messages
				add: [
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
			},
			states: {
				init: {
					entry: assign({
						commandQueue: () =>
							spawn(createCommandQueueMachine(implementations)),
					}),
					// Spawn the command queue when starting the send thread
					always: "idle",
				},
				idle: {
					id: "idle",
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
							entry: pure((ctx) =>
								currentTransactionIsSendData(ctx)
									? incrementSendDataAttempts
									: undefined,
							),
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
						handshake: {},
						execute: {
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
										target: "#idle",
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
									// Reject simple API commands immediately with a matching error
									{
										actions: rejectCurrentTransaction,
										target: "#idle",
									},
								],
							},
						},
						waitForUpdate: {
							on: {
								nodeUpdate: {
									actions: resolveCurrentTransaction,
									target: "#idle",
								},
							},
							after: {
								// If an update times out, retry if possible - otherwise reject the transaction
								1600: [
									{ cond: "mayRetry", target: "retryWait" },
									{
										actions: rejectCurrentTransactionWithNodeTimeout,
										target: "#idle",
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
					},
				},
			},
		},
		{
			services: {
				// kickOffPreTransmitHandshake: async (ctx) => {
				// 	// Execute the pre transmit handshake and swallow all errors caused by
				// 	// not being able to send the message
				// 	try {
				// 		await (ctx.currentTransaction!
				// 			.message as SendDataRequest).command.preTransmitHandshake();
				// 	} catch (e) {
				// 		if (isSerialCommandError(e)) return;
				// 		throw e;
				// 	}
				// },
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
						guards[guardKey](ctx, event, undefined as any),
					);
				},
			},
		},
	);
	return ret;
}

// states: {
// 	idle: {
// 	  id: "idle",
// 	  on: {
// 		TRIGGER: 'beforeSend'
// 	  }
// 	},
// 	beforeSend: {
// 	  on: {
// 		"": "handshake"
// 	  }
// 	},
// 	handshake: {
// 	  initial: 'required',
// 	  states: {
// 		required: {
// 		  on: {
// 			YES: "invoke",
// 			NO: "#execute",
// 		  }
// 		},
// 		invoke: {
// 		  on: {
// 			SUCCESS: "#waitForUpdate",
// 			FAILURE: "#retry"
// 		  }
// 		},
// 	  }
// 	},
// 	execute: {
// 	  id: "execute",
// 	  on: {
// 		SUCCESS: "#waitForUpdate",
// 		FAILURE: "#retry"
// 	  }
// 	},
// 	waitForUpdate: {
// 	  id: "waitForUpdate",
// 	  on: {
// 		TIMEOUT: "#retry",
// 		UPDATE_HANDSHAKE: "#execute",
// 		UPDATE_EXECUTE: "#idle",
// 	  }
// 	},
// 	retry: {
// 	  id: "retry",
// 	  initial: "init",
// 	  states: {
// 		init: {
// 		  on: {
// 			YES: "retryWait",
// 			NO: "#idle",
// 		  },
// 		},
// 		retryWait: {
// 		  after: {
// 			500: "beforeSend"
// 		  }
// 		},
// 	  }
// 	},
//   }
