import { assign, Interpreter, Machine, StateMachine } from "xstate";

/* eslint-disable @typescript-eslint/ban-types */
export interface NodeReadyStateSchema {
	states: {
		notReady: {};
		readyIfNotDead: {};
		ready: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface NodeReadyContext {
	isMaybeDead: boolean;
}

export type NodeReadyEvent =
	| { type: "NOT_DEAD" }
	| { type: "MAYBE_DEAD" }
	| { type: "RESTART_FROM_CACHE" }
	| { type: "INTERVIEW_DONE" };

export type NodeReadyMachine = StateMachine<
	NodeReadyContext,
	NodeReadyStateSchema,
	NodeReadyEvent
>;
export type NodeReadyInterpreter = Interpreter<
	NodeReadyContext,
	NodeReadyStateSchema,
	NodeReadyEvent
>;

export function createNodeReadyMachine(
	initialContext: Partial<NodeReadyContext> = {},
): NodeReadyMachine {
	return Machine<NodeReadyContext, NodeReadyStateSchema, NodeReadyEvent>(
		{
			id: "nodeReady",
			initial: "notReady",
			context: {
				isMaybeDead: true,
				...initialContext,
			},
			on: {
				MAYBE_DEAD: {
					actions: assign({ isMaybeDead: true }) as any,
				},
				NOT_DEAD: {
					actions: assign({ isMaybeDead: false }) as any,
				},
				INTERVIEW_DONE: {
					target: "ready",
					actions: assign({ isMaybeDead: false }) as any,
				},
			},
			states: {
				notReady: {
					entry: assign({ isMaybeDead: true }) as any,
					on: {
						RESTART_FROM_CACHE: [{ target: "readyIfNotDead" }],
					},
				},
				readyIfNotDead: {
					always: [{ cond: "isDefinitelyNotDead", target: "ready" }],
					on: {
						NOT_DEAD: {
							target: "ready",
							actions: assign({ isMaybeDead: false }) as any,
						},
					},
				},
				ready: {
					// If this is final, we will get warnings in the log
					// So don't :)
				},
			},
		},
		{
			guards: {
				isDefinitelyNotDead: (ctx) => !ctx.isMaybeDead,
			},
		},
	);
}
