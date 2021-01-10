import { createModel } from "@xstate/test";
import {
	createDeferredPromise,
	DeferredPromise,
} from "alcalzone-shared/deferred-promise";
import { assign, interpret, Machine, State } from "xstate";
import type { Message } from "../message/Message";
import {
	dummyCallbackNOK,
	dummyCallbackOK,
	dummyCallbackPartial,
	dummyMessageNoResponseNoCallback,
	dummyMessageNoResponseWithCallback,
	dummyMessageUnrelated,
	dummyMessageWithResponseNoCallback,
	dummyMessageWithResponseWithCallback,
	dummyResponseNOK,
	dummyResponseOK,
} from "../test/messages";
import {
	createSerialAPICommandMachine,
	SerialAPICommandDoneData,
	SerialAPICommandInterpreter,
	SerialAPICommandMachineParams,
} from "./SerialAPICommandMachine";

/* eslint-disable @typescript-eslint/ban-types */
interface TestMachineStateSchema {
	states: {
		init: {};
		sending: {};
		waitForACK: {};
		waitForResponse: {};
		waitForCallback: {};
		unsolicited: {};
		success: {};
		failure: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

interface TestMachineContext {
	resp: boolean;
	cb: boolean;
	gotPartialCB?: boolean;
	attempt: number;
}

type TestMachineEvents =
	| {
			type: "CREATE";
			expectsResponse: boolean;
			expectsCallback: boolean;
	  }
	| { type: "SEND_SUCCESS" }
	| { type: "SEND_FAILURE" }
	| { type: "ACK" }
	| { type: "ACK_TIMEOUT" }
	| { type: "CAN" }
	| { type: "NAK" }
	| { type: "RESPONSE_OK" }
	| { type: "RESPONSE_NOK" }
	| { type: "RESPONSE_TIMEOUT" }
	| { type: "CALLBACK_OK" }
	| { type: "CALLBACK_NOK" }
	| { type: "CALLBACK_PARTIAL" }
	| { type: "CALLBACK_TIMEOUT" }
	| { type: "UNSOLICITED" };

const messages = {
	false: {
		false: dummyMessageNoResponseNoCallback,
		true: dummyMessageNoResponseWithCallback,
	},
	true: {
		false: dummyMessageWithResponseNoCallback,
		true: dummyMessageWithResponseWithCallback,
	},
};

interface MockImplementations {
	sendData: jest.Mock<any, any>;
	notifyRetry: jest.Mock<any, any>;
}

interface TestContext {
	interpreter: SerialAPICommandInterpreter;
	implementations: MockImplementations;
	sendDataPromise?: DeferredPromise<any> | undefined;
	machineResult?: any;
	expectedFailureReason?: (SerialAPICommandDoneData & {
		type: "failure";
	})["reason"];
	expectedResult?: Message;
	respondedUnsolicited?: boolean;
}

jest.useFakeTimers();

const machineParams: SerialAPICommandMachineParams = {
	timeouts: {
		ack: 1000,
		response: 1600,
		sendDataCallback: 65000,
	},
	attempts: {
		controller: 3,
	},
};

describe("lib/driver/SerialAPICommandMachine", () => {
	const testMachine = Machine<
		TestMachineContext,
		TestMachineStateSchema,
		TestMachineEvents
	>(
		{
			id: "SerialAPICommandTest",
			initial: "init",
			context: {
				attempt: 0,
				resp: false,
				cb: false,
			},
			states: {
				init: {
					on: {
						CREATE: {
							target: "sending",
							actions: assign<any, any>((_, evt) => ({
								resp: evt.resp,
								cb: evt.cb,
							})),
						},
					},
				},
				sending: {
					entry: assign<TestMachineContext, any>({
						attempt: (ctx) => ctx.attempt + 1,
					}),
					on: {
						SEND_SUCCESS: "waitForACK",
						SEND_FAILURE: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						UNSOLICITED: "unsolicited",
					},
					meta: {
						test: async (
							{
								interpreter,
								implementations: { sendData },
							}: TestContext,
							state: State<TestMachineContext>,
						) => {
							// Skip the wait time if there should be any
							const att = state.context.attempt;
							if (att > 1) {
								expect(interpreter.state.value).toBe(
									"retryWait",
								);
								jest.advanceTimersByTime(
									100 + (att - 1) * 1000,
								);
							}

							// Assert that sendData was called
							expect(interpreter.state.value).toBe("sending");
							// but not more than 3 times
							expect(att).toBeLessThanOrEqual(3);
							expect(sendData.mock.calls.length).toBe(att);
						},
					},
				},
				waitForACK: {
					on: {
						ACK: [
							{
								target: "waitForResponse",
								cond: "expectsResponse",
							},
							{
								target: "waitForCallback",
								cond: "expectsCallback",
							},
							{ target: "success" },
						],
						NAK: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						CAN: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						ACK_TIMEOUT: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						UNSOLICITED: "unsolicited",
					},
				},
				waitForResponse: {
					on: {
						RESPONSE_OK: [
							{
								target: "waitForCallback",
								cond: "expectsCallback",
							},
							{ target: "success" },
						],
						RESPONSE_NOK: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						RESPONSE_TIMEOUT: [
							{ target: "sending", cond: "maySendAgain" },
							{ target: "failure" },
						],
						UNSOLICITED: "unsolicited",
					},
				},
				waitForCallback: {
					on: {
						CALLBACK_PARTIAL: {
							target: "waitForCallback",
							actions: assign<TestMachineContext, any>({
								gotPartialCB: true,
							}),
						},
						CALLBACK_OK: "success",
						CALLBACK_NOK: "failure",
						CALLBACK_TIMEOUT: "failure",
						UNSOLICITED: "unsolicited",
					},
				},
				unsolicited: {
					meta: {
						test: ({ respondedUnsolicited }: TestContext) => {
							expect(respondedUnsolicited).toBeTrue();
						},
					},
				},
				success: {
					meta: {
						test: ({
							interpreter,
							expectedResult,
							machineResult,
						}: TestContext) => {
							// Ensure that the interpreter is in "success" state
							expect(interpreter.state.value).toBe("success");
							// with the correct reason
							expect(machineResult).toBeObject();
							expect(machineResult).toMatchObject({
								type: "success",
								result: expectedResult,
							});
						},
					},
				},
				failure: {
					meta: {
						test: ({
							interpreter,
							expectedFailureReason,
							machineResult,
							implementations: { sendData },
						}: TestContext) => {
							// Ensure that the interpreter is in "failure" state
							expect(interpreter.state.value).toBe("failure");
							// with the correct reason
							expect(machineResult).toBeObject();
							expect(machineResult).toMatchObject({
								type: "failure",
								reason: expectedFailureReason,
							});
							// and that at most three attempts were made
							expect(
								sendData.mock.calls.length,
							).toBeLessThanOrEqual(3);
						},
					},
				},
			},
		},
		{
			guards: {
				maySendAgain: (ctx) => ctx.attempt < 3,
				expectsResponse: (ctx) => ctx.resp,
				expectsCallback: (ctx) => ctx.cb,
			},
		},
	);

	const testModel = createModel<TestContext, TestMachineContext>(
		testMachine,
	).withEvents({
		CREATE: {
			// test all possible combinations of message expectations
			cases: [
				{ resp: false, cb: false },
				{ resp: false, cb: true },
				{ resp: true, cb: false },
				{ resp: true, cb: true },
			],
		},
		SEND_SUCCESS: {
			exec: ({ sendDataPromise }) => {
				sendDataPromise?.resolve();
			},
		},
		SEND_FAILURE: {
			exec: ({ sendDataPromise }) => {
				sendDataPromise?.reject();
			},
		},
		ACK: ({ interpreter }) => {
			interpreter.send("ACK");
		},
		NAK: ({ interpreter }) => {
			interpreter.send("NAK");
		},
		CAN: ({ interpreter }) => {
			interpreter.send("CAN");
		},
		RESPONSE_OK: ({ interpreter }) => {
			interpreter.send({ type: "message", message: dummyResponseOK });
		},
		RESPONSE_NOK: ({ interpreter }) => {
			interpreter.send({ type: "message", message: dummyResponseNOK });
		},
		CALLBACK_OK: ({ interpreter }) => {
			interpreter.send({ type: "message", message: dummyCallbackOK });
		},
		CALLBACK_NOK: ({ interpreter }) => {
			interpreter.send({ type: "message", message: dummyCallbackNOK });
		},
		CALLBACK_PARTIAL: ({ interpreter }) => {
			interpreter.send({
				type: "message",
				message: dummyCallbackPartial,
			});
		},
		UNSOLICITED: ({ interpreter }) => {
			interpreter.send({
				type: "message",
				message: dummyMessageUnrelated,
			});
		},
		ACK_TIMEOUT: () => {
			jest.advanceTimersByTime(machineParams.timeouts.ack);
		},
		RESPONSE_TIMEOUT: () => {
			jest.advanceTimersByTime(machineParams.timeouts.response);
		},
		CALLBACK_TIMEOUT: () => {
			jest.advanceTimersByTime(machineParams.timeouts.sendDataCallback);
		},
	});

	const testPlans = testModel.getSimplePathPlans();

	testPlans.forEach((plan) => {
		if (plan.state.value === "idle") return;

		const planDescription = plan.description.replace(
			` (${JSON.stringify(plan.state.context)})`,
			"",
		);
		describe(planDescription, () => {
			plan.paths.forEach((path) => {
				it(path.description, () => {
					// eslint-disable-next-line prefer-const
					let context: TestContext;
					const sendData = jest.fn().mockImplementation(() => {
						context.sendDataPromise = createDeferredPromise();
						return context.sendDataPromise;
					});
					const notifyRetry = jest.fn();
					const timestamp = () => 0;
					const log = () => {};
					const logOutgoingMessage = () => {};

					const implementations = {
						sendData,
						notifyRetry,
						timestamp,
						log,
						logOutgoingMessage,
					};

					// parse message from test description
					// CREATE ({"expectsResponse":false,"expectsCallback":false})
					const createMachineRegex = /CREATE \((?<json>[^\)]+)\)/;
					const match = createMachineRegex.exec(path.description);
					if (!match?.groups?.json)
						return path.test(undefined as any);
					// And create a test machine with it
					const msg = JSON.parse(match.groups.json);
					const machine = createSerialAPICommandMachine(
						// @ts-ignore
						messages[msg.resp][msg.cb],
						implementations as any,
						machineParams,
					);

					context = {
						interpreter: interpret(machine),
						implementations,
					};
					context.interpreter
						.onEvent((evt) => {
							if (evt.type === "unsolicited") {
								context.respondedUnsolicited = true;
							}
						})
						.onDone((evt) => {
							context.machineResult = evt.data;
						});
					// context.interpreter.onTransition((state) => {
					// 	if (state.changed) console.log(state.value);
					// });
					context.interpreter.start();

					if (plan.state.value === "failure") {
						// parse expected failure reason from plan
						const failureEvent = path.segments.slice(-1)?.[0]?.event
							.type;
						context.expectedFailureReason = (() => {
							switch (failureEvent) {
								case "SEND_FAILURE":
									return "send failure";
								case "RESPONSE_NOK":
									return "response NOK";
								case "CALLBACK_NOK":
									return "callback NOK";
								case "ACK_TIMEOUT":
									return "ACK timeout";
								case "RESPONSE_TIMEOUT":
									return "response timeout";
								case "CALLBACK_TIMEOUT":
									return "callback timeout";
								case "NAK":
								case "CAN":
									return failureEvent;
							}
						})();
					} else if (plan.state.value === "success") {
						// parse expected success event from plan
						const successEvent = path.segments.slice(-1)?.[0]?.event
							.type;
						context.expectedResult = (() => {
							switch (successEvent) {
								case "ACK":
									return;
								case "RESPONSE_OK":
									return dummyResponseOK;
								case "CALLBACK_OK":
									return dummyCallbackOK;
							}
						})();
					}

					return path.test(context);
				});
			});
		});
	});

	it("coverage", () => {
		testModel.testCoverage({
			filter: (stateNode) => {
				return !!stateNode.meta;
			},
		});
	});
});
