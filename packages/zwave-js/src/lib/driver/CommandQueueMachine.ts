import type { Message } from "@zwave-js/serial";
import { getErrorMessage } from "@zwave-js/shared";
import { SortedList } from "alcalzone-shared/sorted-list";
import {
	ActionObject,
	ActorRefFrom,
	assign,
	AssignAction,
	Interpreter,
	Machine,
	spawn,
	StateMachine,
} from "xstate";
import { forwardTo, pure, raise, sendParent, stop } from "xstate/lib/actions";
import { isSendData } from "../serialapi/transport/SendDataShared";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandMachine,
	SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";
import {
	notifyUnsolicited,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

/*
	The command queue is a small wrapper around the Serial API Command Machine
	which does basic queue handling and aborts timed out send data commands.
	It does not care about node status etc.
*/

/* eslint-disable @typescript-eslint/ban-types */
export interface CommandQueueStateSchema {
	states: {
		idle: {};
		execute: {};
		abortSendData: {};
		executeDone: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface CommandQueueContext {
	queue: SortedList<Transaction>;
	callbackIDs: WeakMap<Transaction, string>;
	currentTransaction?: Transaction;
	abortActor?: ActorRefFrom<SerialAPICommandMachine>;
}

export type CommandQueueEvent =
	| { type: "trigger" } // Used internally to trigger sending from the idle state
	| { type: "add"; transaction: Transaction; from: string } // Adds a transaction to the command queue
	// These events are forwarded to the SerialAPICommand machine
	| { type: "ACK" }
	| { type: "CAN" }
	| { type: "NAK" }
	// Used for received messages. The message will be returned as unsolicited when it is not expected
	| { type: "message"; message: Message }
	| { type: "unsolicited"; message: Message }
	| { type: "remove"; transaction: Transaction } // Used to abort the given transaction and remove it from the command queue
	| { type: "command_error"; error: Error } // An unexpected error occured during command execution
	| ({ type: "command_success" } & Omit<
			CommandQueueDoneData & { type: "success" },
			"type"
	  >)
	| ({ type: "command_failure" } & Omit<
			CommandQueueDoneData & { type: "failure" },
			"type"
	  >);

// Success and errors are passed through from the API command machine
export type CommandQueueDoneData = SerialAPICommandDoneData & {
	transaction: Transaction;
};

export type CommandQueueMachine = StateMachine<
	CommandQueueContext,
	CommandQueueStateSchema,
	CommandQueueEvent,
	any,
	any,
	any,
	any
>;
export type CommandQueueInterpreter = Interpreter<
	CommandQueueContext,
	CommandQueueStateSchema,
	CommandQueueEvent
>;

const setCurrentTransaction: AssignAction<CommandQueueContext, any> = assign(
	(ctx) => ({
		...ctx,
		currentTransaction: ctx.queue.shift()!,
	}),
);

const deleteCurrentTransaction: AssignAction<CommandQueueContext, any> = assign(
	(ctx) => {
		ctx.callbackIDs.delete(ctx.currentTransaction!);
		return {
			...ctx,
			currentTransaction: undefined,
		};
	},
);

const stopTransaction = sendParent((ctx: CommandQueueContext, evt: any) => ({
	type: "forward",
	from: "QUEUE",
	to: ctx.callbackIDs.get(evt.transaction),
	payload: {
		type: "stop",
	},
}));

const removeFromQueue: AssignAction<CommandQueueContext, any> = assign(
	(ctx, evt: any) => {
		ctx.queue.remove(evt.transaction);
		ctx.callbackIDs.delete(evt.transaction);
		return ctx;
	},
);

const stopAbortMachine = pure((ctx: CommandQueueContext) => {
	const ret: ActionObject<CommandQueueContext, any>[] = [];
	if (ctx.abortActor) {
		ret.push(stop(ctx.abortActor.id));
	}
	ret.push(assign({ abortActor: (_) => undefined }));
	return ret;
});

const notifyResult = sendParent((ctx: CommandQueueContext, evt: any) => ({
	type: "forward",
	from: "QUEUE",
	to: ctx.callbackIDs.get(ctx.currentTransaction!),
	payload: {
		...evt.data,
		type:
			evt.data.type === "success" ? "command_success" : "command_failure",
	},
}));

const notifyError = sendParent((ctx: CommandQueueContext, evt: any) => ({
	type: "forward",
	from: "QUEUE",
	to: ctx.callbackIDs.get(ctx.currentTransaction!),
	payload: {
		type: "command_error",
		error: evt.data,
		transaction: ctx.currentTransaction,
	},
}));

export function createCommandQueueMachine(
	implementations: ServiceImplementations,
	params: SerialAPICommandMachineParams,
): CommandQueueMachine {
	const spawnAbortMachine: AssignAction<CommandQueueContext, any> = assign({
		abortActor: (_) =>
			spawn(
				createSerialAPICommandMachine(
					implementations.createSendDataAbort(),
					implementations,
					params,
				),
			),
	});

	return Machine<
		CommandQueueContext,
		CommandQueueStateSchema,
		CommandQueueEvent
	>(
		{
			preserveActionOrder: true,
			id: "CommandQueue",
			initial: "idle",
			context: {
				queue: new SortedList(),
				callbackIDs: new WeakMap(),
				// currentTransaction: undefined,
			},
			on: {
				add: {
					actions: [
						assign((ctx, evt) => {
							ctx.queue.add(evt.transaction);
							ctx.callbackIDs.set(evt.transaction, evt.from);
							return ctx;
						}),
						raise("trigger") as any,
					],
				},

				// What to do when removing transactions depends on their state
				remove: [
					// Abort ongoing SendData commands when the transaction is removed. The transaction machine will
					// stop on its own
					{
						cond: "isCurrentTransactionAndSendData",
						actions: [spawnAbortMachine, stopTransaction],
					},
					// If the transaction to remove is the current transaction, but not SendData
					// we can't just end it because it would risk putting the driver and stick out of sync
					{
						cond: "isNotCurrentTransaction",
						actions: [stopTransaction, removeFromQueue],
					},
				],

				// Then a serial API machine is active, forward the message. Otherwise, return all messages as unsolicited.
				message: [
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
					{ actions: notifyUnsolicited },
				],
				unsolicited: [
					// The Serial API has determined this message to be unsolicited
					// Forward it to the SendThreadMachine
					{ actions: notifyUnsolicited },
				],

				// Forward low-level messages to the correct actor
				ACK: [
					{
						cond: "isAbortingInFlight",
						actions: forwardTo((ctx) => ctx.abortActor!),
					},
					{
						cond: "isAbortingWithTimeout",
						actions: forwardTo("executeSendDataAbort"),
					},
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
				CAN: [
					{
						cond: "isAbortingInFlight",
						actions: forwardTo((ctx) => ctx.abortActor!),
					},
					{
						cond: "isAbortingWithTimeout",
						actions: forwardTo("executeSendDataAbort"),
					},
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
				NAK: [
					{
						cond: "isAbortingInFlight",
						actions: forwardTo((ctx) => ctx.abortActor!),
					},
					{
						cond: "isAbortingWithTimeout",
						actions: forwardTo("executeSendDataAbort"),
					},
					{
						cond: "isExecuting",
						actions: forwardTo("execute"),
					},
				],
			},
			states: {
				idle: {
					entry: deleteCurrentTransaction,
					on: {
						trigger: "idle",
					},
					always: {
						target: "execute",
						actions: setCurrentTransaction,
						cond: "queueNotEmpty",
					},
				},
				execute: {
					invoke: {
						id: "execute",
						src: "executeSerialAPICommand",
						onDone: [
							// If the transition was aborted in flight, just silently ignore
							// the result. The transaction was meant to be dropped or will be
							// rejected anyways.
							{
								cond: "isAbortingInFlight",
								target: "executeDone",
							},
							// On success, forward the response to our parent machine
							{
								cond: "executeSuccessful",
								actions: notifyResult,
								target: "executeDone",
							},
							// On failure, abort timed out send attempts
							{
								cond: "isSendDataWithCallbackTimeout",
								target: "abortSendData",
								actions: notifyResult,
							},
							// And just notify the parent about other failures
							{
								target: "executeDone",
								actions: notifyResult,
							},
						],
						onError: {
							target: "executeDone",
							actions: notifyError,
						},
					},
				},
				abortSendData: {
					invoke: {
						id: "executeSendDataAbort",
						src: "executeSendDataAbort",
						onDone: "executeDone",
					},
				},
				executeDone: {
					always: {
						target: "idle",
						actions: [
							// Delete the current transaction after we're done
							deleteCurrentTransaction,
							stopAbortMachine,
						],
					},
				},
			},
		},
		{
			services: {
				executeSerialAPICommand: (ctx) => {
					try {
						return createSerialAPICommandMachine(
							ctx.currentTransaction!.parts.current!,
							implementations,
							params,
						);
					} catch (e) {
						// If there is an error while creating the command machine (e.g. during message serialization)
						// wrap it in a rejected promise, so xstate can handle it
						implementations.log(
							`Unexpected error during SerialAPI command: ${getErrorMessage(
								e,
								true,
							)}`,
							"error",
						);
						return Promise.reject(e);
					}
				},
				executeSendDataAbort: (_) =>
					createSerialAPICommandMachine(
						implementations.createSendDataAbort(),
						implementations,
						params,
					),
			},
			guards: {
				executeSuccessful: (_, evt: any) =>
					evt.data?.type === "success",
				queueNotEmpty: (ctx) => ctx.queue.length > 0,
				isNotCurrentTransaction: (ctx, evt: any) =>
					ctx.currentTransaction !== evt.transaction,
				isCurrentTransactionAndSendData: (ctx, evt: any) =>
					ctx.currentTransaction === evt.transaction &&
					isSendData(evt.transaction.message),
				currentTransactionIsSendData: (ctx) =>
					isSendData(ctx.currentTransaction?.parts.current),
				isSendDataWithCallbackTimeout: (ctx, evt: any) => {
					return (
						isSendData(ctx.currentTransaction?.parts.current) &&
						evt.data?.type === "failure" &&
						evt.data?.reason === "callback timeout"
					);
				},
				isExecuting: (ctx, evt, meta) => meta.state.matches("execute"),
				isAbortingWithTimeout: (ctx, evt, meta) =>
					meta.state.matches("abortSendData"),
				isAbortingInFlight: (ctx) => ctx.abortActor != undefined,
			},
			delays: {},
		},
	);
}
