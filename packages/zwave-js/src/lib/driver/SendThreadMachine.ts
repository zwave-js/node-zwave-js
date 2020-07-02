import { SortedList } from "alcalzone-shared/sorted-list";
import { assign, Interpreter, Machine, send, StateMachine } from "xstate";
import type { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
export interface SendThreadStateSchema {
	states: {
		idle: {};
		empty: {};
		transaction: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface SendThreadContext {
	queue: SortedList<Transaction>;
}

export type SendThreadEvent =
	| { type: "add"; transaction: Transaction }
	| { type: "trigger" };

export interface ServiceImplementations {
	// sendData: (data: Buffer) => Promise<void>;
	// notifyRetry?: (
	// 	attempts: number,
	// 	maxAttempts: number,
	// 	delay: number,
	// ) => void;
}

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
						trigger: "transaction",
					},
				},
				transaction: {},
			},
		},
		{
			services: {},
			guards: {
				queueEmpty: (ctx) => ctx.queue.length === 0,
			},
			delays: {},
		},
	);
}
