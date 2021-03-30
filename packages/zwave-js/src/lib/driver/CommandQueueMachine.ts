import { SortedList } from "alcalzone-shared/sorted-list";
import {
	assign,
	AssignAction,
	EventObject,
	Interpreter,
	Machine,
	StateMachine,
} from "xstate";
import { raise, sendParent } from "xstate/lib/actions";
import { isSendData } from "../controller/SendDataShared";
import type { Message } from "../message/Message";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";
import {
	respondUnsolicited,
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
	currentTransaction?: Transaction;
}

export type CommandQueueEvent =
	| { type: "trigger" } // Used internally to trigger sending from the idle state
	| { type: "add"; transaction: Transaction } // Adds a transaction to the command queue
	| { type: "message"; message: Message } // Used for received messages. The message will be returned as unsolicited when it is not expected
	| { type: "reset" } // Used to abort the ongoing transaction and clear the command queue
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
	CommandQueueEvent
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
	(ctx) => ({
		...ctx,
		currentTransaction: undefined,
	}),
);

const clearQueue: AssignAction<CommandQueueContext, any> = assign((ctx) => {
	const queue = ctx.queue;
	queue.clear();
	return { ...ctx, queue };
});

const notifyResult = sendParent<
	CommandQueueContext,
	EventObject & { data: SerialAPICommandDoneData },
	CommandQueueEvent
>((ctx, evt: any) => ({
	...evt.data,
	type: evt.data.type === "success" ? "command_success" : "command_failure",
	transaction: ctx.currentTransaction,
}));

const notifyError = sendParent<CommandQueueContext, any, CommandQueueEvent>(
	(ctx, evt) => ({
		type: "command_error",
		error: evt.data,
		transaction: ctx.currentTransaction,
	}),
);

export function createCommandQueueMachine(
	implementations: ServiceImplementations,
	params: SerialAPICommandMachineParams,
): CommandQueueMachine {
	return Machine<
		CommandQueueContext,
		CommandQueueStateSchema,
		CommandQueueEvent
	>(
		{
			id: "CommandQueue",
			initial: "idle",
			context: {
				queue: new SortedList(),
				// currentTransaction: undefined,
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
						raise("trigger") as any,
					],
				},
				// By default, return all messages as unsolicited. The only exception is an active serial API machine
				message: { actions: respondUnsolicited },
			},
			states: {
				idle: {
					entry: deleteCurrentTransaction,
					on: {
						trigger: "execute",
					},
					always: {
						target: "execute",
						cond: "queueNotEmpty",
					},
				},
				execute: {
					entry: setCurrentTransaction,
					on: {
						// Now the message event gets auto-forwarded to the serial API machine
						message: undefined,
						// Clear the queue and abort ongoing send data commands when a reset event is received
						reset: [
							{
								cond: "currentTransactionIsSendData",
								actions: clearQueue,
								target: "abortSendData",
							},
							{ actions: clearQueue, target: "executeDone" },
						],
					},
					invoke: {
						id: "execute",
						src: "executeSerialAPICommand",
						autoForward: true,
						onDone: [
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
						autoForward: true,
						onDone: "executeDone",
					},
				},
				executeDone: {
					always: {
						target: "idle",
						actions: [
							// Delete the current transaction after we're done
							deleteCurrentTransaction,
						],
					},
				},
			},
		},
		{
			services: {
				executeSerialAPICommand: (ctx) => {
					// If there is an error while creating the command machine (e.g. during message serialization)
					// wrap it in a rejected promise, so xstate can handle it
					try {
						return createSerialAPICommandMachine(
							ctx.currentTransaction!.message,
							implementations,
							params,
						);
					} catch (e) {
						implementations.log(
							`Unexpected error during SerialAPI command: ${e}`,
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
				currentTransactionIsSendData: (ctx) =>
					isSendData(ctx.currentTransaction?.message),
				isSendDataWithCallbackTimeout: (ctx, evt: any) => {
					return (
						isSendData(ctx.currentTransaction?.message) &&
						evt.data?.type === "failure" &&
						evt.data?.reason === "callback timeout"
					);
				},
			},
			delays: {},
		},
	);
}
