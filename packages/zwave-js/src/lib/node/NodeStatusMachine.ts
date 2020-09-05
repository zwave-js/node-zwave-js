import { Interpreter, Machine, StateMachine } from "xstate";
import type { ZWaveNode } from "zwave-js/src/lib/node/Node";

/* eslint-disable @typescript-eslint/ban-types */
export interface NodeStatusStateSchema {
	states: {
		unknown: {};
		// non-sleeping nodes are either dead or alive
		dead: {};
		alive: {};
		// sleeping nodes are asleep or awake
		asleep: {};
		awake: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

export interface NodeStatusContext {
	// txTimestamp?: number;
}

export type NodeStatusEvent =
	| { type: "DEAD" }
	| { type: "ALIVE" }
	| { type: "ASLEEP" }
	| { type: "AWAKE" }
	| { type: "TRANSACTION_COMPLETE" };

export type NodeStatusMachine = StateMachine<
	NodeStatusContext,
	NodeStatusStateSchema,
	NodeStatusEvent
>;
export type NodeStatusInterpreter = Interpreter<
	NodeStatusContext,
	NodeStatusStateSchema,
	NodeStatusEvent
>;

export function createNodeStatusMachine(
	node: ZWaveNode,
	initialContext: Partial<NodeStatusContext> = {},
): NodeStatusMachine {
	return Machine<NodeStatusContext, NodeStatusStateSchema, NodeStatusEvent>(
		{
			id: "serialAPI",
			initial: "unknown",
			context: {
				// maxAttempts: 3,
				...initialContext,
			},
			on: {},
			states: {
				unknown: {
					on: {
						DEAD: "dead",
						ALIVE: "alive",
						ASLEEP: "asleep",
						AWAKE: "awake",
					},
				},
				dead: {
					on: {
						ALIVE: "alive",
					},
				},
				alive: {
					on: {
						DEAD: "dead",
					},
				},
				asleep: {
					on: {
						AWAKE: "awake",
					},
				},
				awake: {
					on: {
						ASLEEP: "asleep",
						TRANSACTION_COMPLETE: "awake",
					},
					after: {
						10000: "asleep",
					},
				},
			},
		},
		{
			services: {
				// send: (ctx) => sendData(ctx.data),
			},
			guards: {
				// mayRetry: (ctx) => ctx.attempts < ctx.maxAttempts,
			},
			delays: {
				// RETRY_DELAY: (ctx) => computeRetryDelay(ctx),
			},
		},
	);
}
