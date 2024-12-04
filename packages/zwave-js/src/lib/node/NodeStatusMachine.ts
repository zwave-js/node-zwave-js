import {
	type InferStateMachineTransitions,
	NodeStatus,
	StateMachine,
	type StateMachineTransition,
} from "@zwave-js/core";
import { type NodeNetworkRole } from "./mixins/01_NetworkRole.js";

export type NodeStatusState = {
	value: "unknown" | "dead" | "alive" | "asleep" | "awake";
};

export type NodeStatusMachineInput = {
	value: "DEAD" | "ALIVE" | "ASLEEP" | "AWAKE";
};

export type NodeStatusMachine = StateMachine<
	NodeStatusState,
	NodeStatusMachineInput
>;

function to(state: NodeStatusState): StateMachineTransition<NodeStatusState> {
	return { newState: state };
}

const statusDict = {
	unknown: NodeStatus.Unknown,
	dead: NodeStatus.Dead,
	alive: NodeStatus.Alive,
	asleep: NodeStatus.Asleep,
	awake: NodeStatus.Awake,
} as const;

export function nodeStatusMachineStateToNodeStatus(
	state: NodeStatusState["value"],
): NodeStatus {
	return statusDict[state] ?? NodeStatus.Unknown;
}

export function createNodeStatusMachine(
	node: NodeNetworkRole,
): NodeStatusMachine {
	const initialState: NodeStatusState = {
		value: "unknown",
	};

	const transitions: InferStateMachineTransitions<NodeStatusMachine> =
		(state) => (input) => {
			switch (state.value) {
				case "unknown": {
					switch (input.value) {
						case "DEAD":
							if (!node.canSleep) return to({ value: "dead" });
							break;
						case "ALIVE":
							if (!node.canSleep) return to({ value: "alive" });
							break;
						case "ASLEEP":
							if (node.canSleep) return to({ value: "asleep" });
							break;
						case "AWAKE":
							if (node.canSleep) return to({ value: "awake" });
							break;
					}
					break;
				}
				case "dead": {
					if (input.value === "ALIVE") return to({ value: "alive" });
					break;
				}
				case "alive": {
					switch (input.value) {
						case "DEAD":
							return to({ value: "dead" });
						// GH#1054 we must have a way to send a node to sleep even if
						// it was previously detected as a non-sleeping device
						case "ASLEEP": {
							if (node.canSleep) return to({ value: "asleep" });
							break;
						}
						case "AWAKE": {
							if (node.canSleep) return to({ value: "awake" });
							break;
						}
					}
					break;
				}
				case "asleep": {
					if (input.value === "AWAKE") return to({ value: "awake" });
					break;
				}
				case "awake": {
					if (input.value === "ASLEEP") {
						return to({ value: "asleep" });
					}
					break;
				}
			}
		};

	return new StateMachine(initialState, transitions);
}
