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
import {
	SendDataMulticastRequest,
	SendDataRequest,
} from "../controller/SendDataMessages";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
} from "./SerialAPICommandMachine";
import type { ServiceImplementations } from "./StateMachineShared";
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

const notifyResult = sendParent<
	CommandQueueContext,
	EventObject & { data: SerialAPICommandDoneData },
	CommandQueueEvent
>((ctx, evt: any) => ({
	...evt.data,
	type: evt.data.type === "success" ? "command_success" : "command_failure",
	transaction: ctx.currentTransaction,
}));

export function createCommandQueueMachine(
	implementations: ServiceImplementations,
	initialContext: Partial<CommandQueueContext> = {},
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
						raise("trigger") as any,
					],
				},
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
				executeSerialAPICommand: (ctx) =>
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
				executeSuccessful: (_, evt: any) =>
					evt.data?.type === "success",
				queueNotEmpty: (ctx) => ctx.queue.length > 0,
				isSendDataWithCallbackTimeout: (ctx, evt: any) => {
					const msg = ctx.currentTransaction?.message;
					return (
						(msg instanceof SendDataRequest ||
							msg instanceof SendDataMulticastRequest) &&
						evt.data?.type === "failure" &&
						evt.data?.reason === "callback timeout"
					);
				},
			},
			delays: {},
		},
	);
}
