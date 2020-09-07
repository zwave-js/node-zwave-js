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
	| { type: "RESTART_INTERVIEW_FROM_CACHE" }
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
					actions: assign({ isMaybeDead: true }),
				},
				NOT_DEAD: {
					actions: assign({ isMaybeDead: false }),
				},
				INTERVIEW_DONE: {
					target: "ready",
					actions: assign({ isMaybeDead: false }),
				},
			},
			states: {
				notReady: {
					entry: assign({ isMaybeDead: true }),
					on: {
						RESTART_INTERVIEW_FROM_CACHE: [
							{ target: "readyIfNotDead" },
						],
					},
				},
				readyIfNotDead: {
					always: [{ cond: "isDefinitelyNotDead", target: "ready" }],
					on: {
						NOT_DEAD: {
							target: "ready",
							actions: assign({ isMaybeDead: false }),
						},
					},
				},
				ready: {
					type: "final",
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
