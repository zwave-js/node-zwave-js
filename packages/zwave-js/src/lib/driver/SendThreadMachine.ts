import { SortedList } from "alcalzone-shared/sorted-list";
import { assign, Interpreter, Machine, send, StateMachine } from "xstate";
import {
	createSerialAPICommandMachine,
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
		empty: {};
		execute: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface SendThreadContext {
	queue: SortedList<Transaction>;
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
					on: {
						"": [{ cond: "queueEmpty", target: "empty" }],
					},
				},
				empty: {
					on: {
						trigger: "execute",
					},
				},
				execute: {
					invoke: {
						id: "execute",
						src: "execute",
						autoForward: true,
						onDone: [
							{
								cond: "executeSuccessful",
								actions: assign({
									queue: (ctx, evt) => {
										const transaction = ctx.queue.shift()!;
										transaction.promise.resolve(
											evt.data.result,
										);
										return ctx.queue;
									},
								}),
								target: "idle",
							},
							{
								actions: assign({
									queue: (ctx, evt) => {
										const transaction = ctx.queue.shift()!;
										transaction.promise.reject(
											serialAPICommandErrorToZWaveError(
												evt.data.reason,
											),
										);
										return ctx.queue;
									},
								}),
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
						ctx.queue.peekStart()!.message,
						implementations,
					),
			},
			guards: {
				queueEmpty: (ctx) => ctx.queue.length === 0,
				executeSuccessful: (_, evt: any) => evt.data.type === "success",
			},
			delays: {},
		},
	);
}
