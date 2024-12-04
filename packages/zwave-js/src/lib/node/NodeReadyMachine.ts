import {
	StateMachine,
	type StateMachineTransition,
	type StateMachineTransitions,
} from "@zwave-js/core";

export type NodeReadyState = {
	value: "notReady";
	maybeDead: boolean;
} | {
	value: "readyIfNotDead";
} | {
	value: "ready";
	done: true;
};

export type NodeReadyMachineInput = {
	input: "NOT_DEAD" | "MAYBE_DEAD" | "RESTART_FROM_CACHE" | "INTERVIEW_DONE";
};

export type NodeReadyMachine = StateMachine<
	NodeReadyState,
	NodeReadyMachineInput
>;

function to(state: NodeReadyState): StateMachineTransition<NodeReadyState> {
	return { newState: state };
}

export function createNodeReadyMachine(): NodeReadyMachine {
	const initialState: NodeReadyState = {
		value: "notReady",
		maybeDead: true,
	};

	const READY: NodeReadyState = { value: "ready", done: true };

	const transitions: StateMachineTransitions<NodeReadyMachine> =
		(state) => (input) => {
			switch (state.value) {
				case "notReady": {
					switch (input.input) {
						case "NOT_DEAD":
							return to({ ...state, maybeDead: false });
						case "MAYBE_DEAD":
							return to({ ...state, maybeDead: true });
						case "RESTART_FROM_CACHE":
							if (state.maybeDead) {
								return to({ value: "readyIfNotDead" });
							} else {
								return to(READY);
							}
						case "INTERVIEW_DONE":
							return to(READY);
					}
					break;
				}
				case "readyIfNotDead": {
					switch (input.input) {
						case "NOT_DEAD":
							return to(READY);
					}
					break;
				}
			}
		};

	return new StateMachine(initialState, transitions);
}
