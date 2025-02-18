import { type InclusionControllerStep } from "@zwave-js/cc";
import {
	type InferStateMachineTransitions,
	type NodeUpdatePayload,
	StateMachine,
	type StateMachineTransition,
} from "@zwave-js/core";
import { type ZWaveNode } from "../node/Node.js";

export type ProxyInclusionState =
	| {
		value: "initial";
	}
	| {
		value: "hasNIF";
		nodeInfo: NodeUpdatePayload;
		newNode: ZWaveNode;
	}
	| {
		value: "hasInitiate";
		inclusionControllerNodeId: number;
		includedNodeId: number;
		step: InclusionControllerStep;
	}
	| {
		value: "bootstrapping";
		inclusionControllerNodeId?: number;
		step?: InclusionControllerStep;
		nodeInfo: NodeUpdatePayload;
		newNode: ZWaveNode;
		done: true;
	}
	| {
		value: "failure";
		done: true;
	};

export type ProxyInclusionMachineInput = {
	value: "NIF";
	nodeInfo: NodeUpdatePayload;
	newNode: ZWaveNode;
} | {
	value: "INITIATE";
	inclusionControllerNodeId: number;
	includedNodeId: number;
	step: InclusionControllerStep;
} | {
	value: "INITIATE_TIMEOUT" | "NIF_TIMEOUT";
};

export type ProxyInclusionMachine = StateMachine<
	ProxyInclusionState,
	ProxyInclusionMachineInput
>;

function to(
	state: ProxyInclusionState,
): StateMachineTransition<ProxyInclusionState> {
	return { newState: state };
}

export function createProxyInclusionMachine(): ProxyInclusionMachine {
	const initialState: ProxyInclusionState = {
		value: "initial",
	};

	const transitions: InferStateMachineTransitions<ProxyInclusionMachine> =
		(state) => (input) => {
			switch (state.value) {
				case "initial": {
					switch (input.value) {
						case "NIF": {
							return to({
								value: "hasNIF",
								nodeInfo: input.nodeInfo,
								newNode: input.newNode,
							});
						}
						case "INITIATE": {
							return to({
								value: "hasInitiate",
								inclusionControllerNodeId:
									input.inclusionControllerNodeId,
								step: input.step,
								includedNodeId: input.includedNodeId,
							});
						}
					}
					break;
				}

				case "hasNIF": {
					switch (input.value) {
						case "INITIATE": {
							if (input.includedNodeId === state.newNode.id) {
								return to({
									value: "bootstrapping",
									inclusionControllerNodeId:
										input.inclusionControllerNodeId,
									nodeInfo: state.nodeInfo,
									newNode: state.newNode,
									step: input.step,
									done: true,
								});
							}
							// FIXME: What to do if there is a mismatch?
							break;
						}

						case "INITIATE_TIMEOUT": {
							// After a timeout, bootstrap anyways but without the inclusion controller
							return to({
								value: "bootstrapping",
								nodeInfo: state.nodeInfo,
								newNode: state.newNode,
								done: true,
							});
						}
					}
					break;
				}

				case "hasInitiate": {
					switch (input.value) {
						case "NIF": {
							if (input.newNode.id === state.includedNodeId) {
								return to({
									value: "bootstrapping",
									inclusionControllerNodeId:
										state.inclusionControllerNodeId,
									step: state.step,
									nodeInfo: input.nodeInfo,
									newNode: input.newNode,
									done: true,
								});
							}
							// FIXME: What to do if there is a mismatch?
							break;
						}

						case "NIF_TIMEOUT": {
							// This should not happen, but abort anyways
							return to({
								value: "failure",
								done: true,
							});
						}
					}
				}
			}
		};

	return new StateMachine(initialState, transitions);
}
