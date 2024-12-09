import {
	type InferStateMachineTransitions,
	StateMachine,
	type StateMachineTransition,
} from "@zwave-js/core";

export type TransportServiceRXState =
	// We are passively listening for segments
	| { value: "receive" }
	// We have requested a missing segment
	| { value: "requestMissing"; offset: number }
	| {
		value: "success" | "failure";
		done: true;
	};

export type TransportServiceRXMachineInput =
	| {
		value: "segment";
		offset: number;
		length: number;
	}
	| { value: "timeout" }
	| { value: "abort" };

export type TransportServiceRXMachine = StateMachine<
	TransportServiceRXState,
	TransportServiceRXMachineInput
>;

function to(
	state: TransportServiceRXState,
): StateMachineTransition<TransportServiceRXState> {
	return { newState: state };
}

export function createTransportServiceRXMachine(
	datagramSize: number,
	firstSegmentSize: number,
): TransportServiceRXMachine {
	const initialState: TransportServiceRXState = {
		value: "receive",
	};

	const receivedBytes: boolean[] = [
		// When the machine is started, we've already received the first segment
		...(new Array(firstSegmentSize).fill(true)),
		// The rest of the segments are still missing
		...(new Array(datagramSize - firstSegmentSize).fill(false)),
	];

	function markReceived(offset: number, length: number): void {
		for (let i = offset; i < offset + length; i++) {
			receivedBytes[i] = true;
		}
	}

	function isComplete(): boolean {
		return receivedBytes.every(Boolean);
	}

	function hasReceivedLastSegment(): boolean {
		return receivedBytes.at(-1)!;
	}

	function hasHole(): boolean {
		return receivedBytes.lastIndexOf(true)
			> receivedBytes.indexOf(false);
	}

	const transitions: InferStateMachineTransitions<
		TransportServiceRXMachine
	> = (state) => (input) => {
		if (input.value === "abort") {
			if (state.value !== "success" && state.value !== "failure") {
				return to({ value: "failure", done: true });
			}
			return;
		}

		switch (state.value) {
			case "receive": {
				if (input.value === "segment") {
					markReceived(input.offset, input.length);
					if (isComplete()) {
						return to({ value: "success", done: true });
					} else if (hasReceivedLastSegment() && hasHole()) {
						return to({
							value: "requestMissing",
							offset: receivedBytes.indexOf(false),
						});
					} else {
						return to({ value: "receive" });
					}
				} else if (input.value === "timeout") {
					// One or more segments are missing, start requesting them
					return to({
						value: "requestMissing",
						offset: receivedBytes.indexOf(false),
					});
				}
				break;
			}

			case "requestMissing": {
				if (input.value === "segment") {
					markReceived(input.offset, input.length);
					if (isComplete()) {
						return to({ value: "success", done: true });
					} else {
						// still not complete, request the next missing segment
						return to({
							value: "requestMissing",
							offset: receivedBytes.indexOf(false),
						});
					}
				} else if (input.value === "timeout") {
					// Give up
					return to({ value: "failure", done: true });
				}
			}
		}
	};

	return new StateMachine(initialState, transitions);
}
