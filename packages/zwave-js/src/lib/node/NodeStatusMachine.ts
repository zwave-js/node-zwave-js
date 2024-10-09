import { type InterpreterFrom, Machine, type StateMachine } from "xstate";
import { NodeStatus } from "./_Types";

export interface NodeStatusStateSchema {
	states: {
		unknown: object;
		// non-sleeping nodes are either dead or alive
		dead: object;
		alive: object;
		// sleeping nodes are asleep or awake
		asleep: object;
		awake: object;
	};
}

const statusDict = {
	unknown: NodeStatus.Unknown,
	dead: NodeStatus.Dead,
	alive: NodeStatus.Alive,
	asleep: NodeStatus.Asleep,
	awake: NodeStatus.Awake,
} as const;
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
	NodeStatusEvent,
	any,
	any,
	any,
	any
>;
export type NodeStatusInterpreter = InterpreterFrom<NodeStatusMachine>;

export function createNodeStatusMachine(canSleep: boolean): NodeStatusMachine {
	return Machine<any, NodeStatusStateSchema, NodeStatusEvent>(
		{
			id: "nodeStatus",
			initial: "unknown",
			states: {
				unknown: {
					on: {
						DEAD: {
							target: "dead",
							cond: "cannotSleep",
						},
						ALIVE: {
							target: "alive",
							cond: "cannotSleep",
						},
						ASLEEP: {
							target: "asleep",
							cond: "canSleep",
						},
						AWAKE: {
							target: "awake",
							cond: "canSleep",
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
							cond: "canSleep",
						},
						AWAKE: {
							target: "awake",
							cond: "canSleep",
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
			guards: {
				canSleep: () => !!canSleep,
				cannotSleep: () => !canSleep,
			},
		},
	);
}
