import { CommandClasses } from "@zwave-js/core";
import { Interpreter, Machine, StateMachine } from "xstate";
import type { ZWaveNode } from "./Node";
import { NodeStatus } from "./Types";

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

const statusDict: Record<keyof NodeStatusStateSchema["states"], NodeStatus> = {
	unknown: NodeStatus.Unknown,
	dead: NodeStatus.Dead,
	alive: NodeStatus.Alive,
	asleep: NodeStatus.Asleep,
	awake: NodeStatus.Awake,
};
export function nodeStatusMachineStateToNodeStatus(
	state: keyof NodeStatusStateSchema["states"],
): NodeStatus {
	return statusDict[state] ?? NodeStatus.Unknown;
}

export type NodeStatusEvent =
	| { type: "DEAD" }
	| { type: "ALIVE" }
	| { type: "ASLEEP" }
	| { type: "AWAKE" };

export type NodeStatusMachine = StateMachine<
	any,
	NodeStatusStateSchema,
	NodeStatusEvent
>;
export type NodeStatusInterpreter = Interpreter<
	any,
	NodeStatusStateSchema,
	NodeStatusEvent
>;

export function createNodeStatusMachine(node: ZWaveNode): NodeStatusMachine {
	return Machine<any, NodeStatusStateSchema, NodeStatusEvent>(
		{
			id: "nodeStatus",
			initial: "unknown",
			states: {
				unknown: {
					on: {
						DEAD: {
							target: "dead",
							cond: "notSupportsWakeup",
						},
						ALIVE: {
							target: "alive",
							cond: "notSupportsWakeup",
						},
						ASLEEP: {
							target: "asleep",
							cond: "supportsWakeup",
						},
						AWAKE: {
							target: "awake",
							cond: "supportsWakeup",
						},
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
						// GH#1054 we must have a way to send a node to sleep even if
						// it was previously detected as a non-sleeping device
						ASLEEP: {
							target: "asleep",
							cond: "supportsWakeup",
						},
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
					},
				},
			},
		},
		{
			services: {
				// send: (ctx) => sendData(ctx.data),
			},
			guards: {
				supportsWakeup: () =>
					node.supportsCC(CommandClasses["Wake Up"]),
				notSupportsWakeup: () =>
					!node.supportsCC(CommandClasses["Wake Up"]),
				// mayRetry: (ctx) => ctx.attempts < ctx.maxAttempts,
			},
			delays: {},
		},
	);
}
