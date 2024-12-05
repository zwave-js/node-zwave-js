import {
	type InferStateMachineTransitions,
	StateMachine,
	type StateMachineTransition,
} from "@zwave-js/core";
import {
	type Message,
	isMultiStageCallback,
	isSendData,
	isSuccessIndicator,
} from "@zwave-js/serial";

export type SerialAPICommandState =
	| { value: "initial" }
	| { value: "sending" }
	| { value: "waitingForACK" }
	| { value: "waitingForResponse" }
	| {
		value: "waitingForCallback";
		responseTimedOut?: boolean;
	}
	| {
		value: "success";
		result?: Message;
		done: true;
	}
	| ({
		value: "failure";
	} & SerialAPICommandMachineFailure);

export type SerialAPICommandMachineFailure =
	| { reason: "ACK timeout"; result?: undefined }
	| { reason: "CAN"; result?: undefined }
	| { reason: "NAK"; result?: undefined }
	| { reason: "response timeout"; result?: undefined }
	| { reason: "callback timeout"; result?: undefined }
	| { reason: "response NOK"; result: Message }
	| { reason: "callback NOK"; result: Message };

export type SerialAPICommandMachineInput =
	| { value: "start" }
	| { value: "message sent" }
	| { value: "ACK" }
	| { value: "CAN" }
	| { value: "NAK" }
	| { value: "timeout" }
	| { value: "response" | "response NOK"; response: Message }
	| { value: "callback" | "callback NOK"; callback: Message };

export type SerialAPICommandMachine = StateMachine<
	SerialAPICommandState,
	SerialAPICommandMachineInput
>;

function to(
	state: SerialAPICommandState,
): StateMachineTransition<SerialAPICommandState> {
	return { newState: state };
}

function callbackIsFinal(callback: Message): boolean {
	return (
		// assume callbacks without success indication to be OK
		(!isSuccessIndicator(callback) || callback.isOK())
		// assume callbacks without isFinal method to be final
		&& (!isMultiStageCallback(callback) || callback.isFinal())
	);
}

export function createSerialAPICommandMachine(
	message: Message,
): SerialAPICommandMachine {
	const initialState: SerialAPICommandState = {
		value: "initial",
	};

	const transitions: InferStateMachineTransitions<SerialAPICommandMachine> =
		(state) => (input) => {
			switch (state.value) {
				case "initial":
					if (input.value === "start") {
						return to({ value: "sending" });
					}
					break;
				case "sending":
					if (input.value === "message sent") {
						if (message.expectsAck()) {
							return to({ value: "waitingForACK" });
						} else {
							return to({
								value: "success",
								result: undefined,
								done: true,
							});
						}
					}
					break;
				case "waitingForACK":
					switch (input.value) {
						case "ACK":
							if (message.expectsResponse()) {
								return to({ value: "waitingForResponse" });
							} else if (message.expectsCallback()) {
								return to({ value: "waitingForCallback" });
							} else {
								return to({
									value: "success",
									result: undefined,
									done: true,
								});
							}
						case "CAN":
							return to({ value: "failure", reason: "CAN" });
						case "NAK":
							return to({ value: "failure", reason: "NAK" });
						case "timeout":
							return to({
								value: "failure",
								reason: "ACK timeout",
							});
					}
					break;
				case "waitingForResponse":
					switch (input.value) {
						case "response":
							if (message.expectsCallback()) {
								return to({ value: "waitingForCallback" });
							} else {
								return to({
									value: "success",
									result: input.response,
									done: true,
								});
							}
						case "response NOK":
							return to({
								value: "failure",
								reason: "response NOK",
								result: input.response,
							});
						case "timeout":
							if (isSendData(message)) {
								return {
									newState: {
										value: "waitingForCallback",
										responseTimedOut: true,
									},
								};
							} else {
								return to({
									value: "failure",
									reason: "response timeout",
								});
							}
					}
					break;
				case "waitingForCallback":
					switch (input.value) {
						case "callback":
							if (callbackIsFinal(input.callback)) {
								return to({
									value: "success",
									result: input.callback,
									done: true,
								});
							} else {
								return to({ value: "waitingForCallback" });
							}
						case "callback NOK":
							// Preserve "response timeout" errors
							// A NOK callback afterwards is expected, but we're not interested in it
							if (state.responseTimedOut) {
								return to({
									value: "failure",
									reason: "response timeout",
								});
							} else {
								return to({
									value: "failure",
									reason: "callback NOK",
									result: input.callback,
								});
							}
						case "timeout":
							return to({
								value: "failure",
								reason: "callback timeout",
							});
					}
					break;
			}
		};

	return new StateMachine(initialState, transitions);
}
