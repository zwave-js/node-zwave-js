import { SortedList } from "alcalzone-shared/sorted-list";
import {
	assign,
	EventObject,
	Interpreter,
	Machine,
	send,
	StateMachine,
} from "xstate";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandEvent,
} from "./SerialAPICommandMachine";
import {
	serialAPICommandErrorToZWaveError,
	ServiceImplementations,
} from "./StateMachineShared";
import type { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		idle: {};
		execute: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface SendThreadContext {
	queue: SortedList<Transaction>;
	currentTransaction?: Transaction;
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" }
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

const rejectCurrentTransaction = assign(
	(
		ctx: SendThreadContext,
		evt: EventObject & {
			data: SerialAPICommandDoneData & {
				type: "failure";
			};
		},
	) => {
		ctx.currentTransaction!.promise.reject(
			serialAPICommandErrorToZWaveError(evt.data.reason, evt.data.result),
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
						send("trigger"),
					],
				},
			},
			states: {
				idle: {
					// There is no current transaction in idle state, so
					// reset it
					onEntry: deleteCurrentTransaction,
					on: {
						"": { cond: "queueNotEmpty", target: "execute" },
						trigger: "execute",
					},
				},
				execute: {
					// Use the first transaction in the queue as the current one
					onEntry: setCurrentTransaction,
					invoke: {
						id: "execute",
						src: "execute",
						autoForward: true,
						onDone: [
							// On success, resolve the current transaction
							{
								cond: "executeSuccessful",
								actions: resolveCurrentTransaction,
								target: "idle",
							},
							// On failure, reject it with a matching error
							{
								actions: rejectCurrentTransaction,
								target: "idle",
							},
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
			},
			guards: {
				queueNotEmpty: (ctx) => ctx.queue.length > 0,
				executeSuccessful: (_, evt: any) => evt.data.type === "success",
			},
			delays: {},
		},
	);
}
