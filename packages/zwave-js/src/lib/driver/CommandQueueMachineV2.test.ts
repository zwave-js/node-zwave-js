import { createModel } from "@xstate/test";
import { SecurityManager } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { assign, interpret, Machine, State } from "xstate";
import { BasicCCReport } from "../commandclass/BasicCC";
import { SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import {
	CommandQueueInterpreter,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import type { Driver } from "./Driver";
import type { SerialAPICommandDoneData } from "./SerialAPICommandMachine";
import { Transaction } from "./Transaction";

/* eslint-disable @typescript-eslint/ban-types */
interface TestMachineStateSchema {
	states: {
		idle: {};
		sending: {};
		aborting: {};
	};
}
/* eslint-enable @typescript-eslint/ban-types */

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface TestMachineContext {
	queueLength: number;
	currentTransaction?: Transaction;
}

type TestMachineEvents =
	| {
			type: "ADD_ONE";
			transaction: Transaction;
	  }
	| {
			type: "API_FAILED";
			reason: (SerialAPICommandDoneData & {
				type: "failure";
			})["reason"];
	  }
	| { type: "API_SUCCESS"; result: Message };

interface TestContext {
	interpreter: CommandQueueInterpreter;
	// implementations: MockImplementations;
}

jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

describe("lib/driver/CommandQueueMaschineV2", () => {
	const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
	const sm = new SecurityManager({
		ownNodeId: 1,
		nonceTimeout: 500,
		networkKey: Buffer.alloc(16, 1),
	});
	(fakeDriver as any).securityManager = sm;

	const sendDataBasicGet = new SendDataRequest(fakeDriver, {
		command: new BasicCCGet(fakeDriver, {
			nodeId: 2,
		}),
	});

	const sendDataBasicReport = new SendDataRequest(fakeDriver, {
		command: new BasicCCReport(fakeDriver, {
			nodeId: 2,
			currentValue: 50,
		}),
	});

	function createTransaction(msg: Message) {
		const ret = new Transaction(
			fakeDriver,
			msg,
			createDeferredPromise(),
			MessagePriority.Normal,
		);
		(ret as any).toJSON = () => ({
			message: msg.constructor.name,
		});
		return ret;
	}

	beforeEach(() => {
		mockSerialAPIMachine.mockReset();
	});

	const testMachine = Machine<
		TestMachineContext,
		TestMachineStateSchema,
		TestMachineEvents
	>(
		{
			id: "CommandQueueTest",
			initial: "idle",
			context: {
				queueLength: 0,
			},
			states: {
				idle: {
					on: {
						ADD_ONE: {
							target: "sending",
							actions: assign<TestMachineContext, any>({
								queueLength: (ctx) => ctx.queueLength + 1,
								currentTransaction: (_, evt) => evt.transaction,
							}),
						},
					},
				},
				sending: {
					on: {
						API_SUCCESS: "done",
					},
					meta: {
						test: async (
							{ interpreter }: TestContext,
							state: State<TestMachineContext>,
						) => {
							expect(mockSerialAPIMachine).toBeCalledTimes(1);
						},
					},
				},
				aborting: {
					meta: {
						test: async (
							{ interpreter }: TestContext,
							state: State<TestMachineContext>,
						) => {},
					},
				},
				done: {
					meta: {
						test: async (
							{ interpreter }: TestContext,
							state: State<TestMachineContext>,
						) => {},
					},
				},
			},
		},
		{
			guards: {},
		},
	);

	const testModel = createModel<TestContext, TestMachineContext>(
		testMachine,
	).withEvents({
		ADD_ONE: {
			exec: ({ interpreter }, event) => {
				interpreter.send({
					type: "add",
					transaction: (event as any).transaction,
				});
			},
			cases: [
				{
					transaction: createTransaction(sendDataBasicGet),
				},
			],
		},
		API_SUCCESS: {
			exec: ({ interpreter }, event) => {
				interpreter.send({
					type: "done.invoke.execute",
					data: {
						type: "success",
						result: (event as any).result,
					},
				} as any);
			},
			cases: [
				{
					result: sendDataBasicReport,
				},
			],
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
					const machine = createCommandQueueMachine({} as any);

					const context = {
						interpreter: interpret(machine),
					};
					context.interpreter.onEvent((evt) => {
						// if (evt.type === "serialAPIUnexpected") {
						// 	context.respondedUnexpected = true;
						// }
					});
					context.interpreter.start();

					// if (plan.state.value === "failure") {
					// 	// parse expected failure reason from plan
					// 	const failureEvent = path.segments.slice(-1)?.[0]?.event
					// 		.type;
					// 	context.expectedFailureReason = (() => {
					// 		switch (failureEvent) {
					// 			case "SEND_FAILURE":
					// 				return "send failure";
					// 			case "RESPONSE_NOK":
					// 				return "response NOK";
					// 			case "CALLBACK_NOK":
					// 				return "callback NOK";
					// 			case "ACK_TIMEOUT":
					// 				return "ACK timeout";
					// 			case "RESPONSE_TIMEOUT":
					// 				return "response timeout";
					// 			case "CALLBACK_TIMEOUT":
					// 				return "callback timeout";
					// 			case "NAK":
					// 			case "CAN":
					// 				return failureEvent;
					// 		}
					// 	})();
					// }

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
