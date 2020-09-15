import { SecurityManager } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { Actor, interpret, Interpreter } from "xstate";
import { BasicCCSet } from "../commandclass/BasicCC";
import { SendDataAbort, SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import {
	CommandQueueContext,
	CommandQueueEvent,
	CommandQueueStateSchema,
	createCommandQueueMachine,
} from "./CommandQueueMachine";
import type { Driver } from "./Driver";
import {
	createSendDataResolvesNever,
	createWrapperMachine,
	dummyMessageNoResponseNoCallback,
} from "./testUtils";
import { Transaction } from "./Transaction";

jest.mock("@zwave-js/core");
jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

describe("lib/driver/CommandQueueMachine", () => {
	jest.setTimeout(100);

	const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
	const sm = new SecurityManager({
		ownNodeId: 1,
		nonceTimeout: 500,
		networkKey: Buffer.alloc(16, 1),
	});
	(fakeDriver as any).securityManager = sm;

	const sendDataBasicSet = new SendDataRequest(fakeDriver, {
		command: new BasicCCSet(fakeDriver, {
			nodeId: 2,
			targetValue: 1,
		}),
	});

	const defaultImplementations = {
		sendData: createSendDataResolvesNever(),
		createSendDataAbort: () => new SendDataAbort(fakeDriver),
		notifyUnsolicited: () => {},
	};

	let service:
		| undefined
		| Interpreter<
				CommandQueueContext,
				CommandQueueStateSchema,
				CommandQueueEvent,
				any
		  >;

	function createTransaction(msg: Message) {
		return new Transaction(
			fakeDriver,
			msg,
			createDeferredPromise(),
			MessagePriority.Normal,
		);
	}

	beforeEach(() => {
		mockSerialAPIMachine.mockReset();
	});

	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	it(`The machine should start in the idle state`, () => {
		const testMachine = createCommandQueueMachine(defaultImplementations);

		service = interpret(testMachine).start();
		expect(service.state.value).toBe("idle");
	});

	describe(`when the machine is idle, ...`, () => {
		it(`should go into "execute" state when a message is queued and execute the serial API command machine`, () => {
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
			);
			service = interpret(testMachine).start();

			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			service.send({ type: "add", transaction });
			expect(service.state.value).toEqual("execute");
			expect(service.state.context.currentTransaction).toBe(transaction);
			expect(mockSerialAPIMachine).toBeCalledTimes(1);
		});

		it(`should go into "execute" state immediately if the queue is not empty`, () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);
			service = interpret(testMachine).start();

			expect(service.state.value).toEqual("execute");
			expect(service.state.context.currentTransaction).toBe(transaction);
			expect(mockSerialAPIMachine).toBeCalledTimes(1);
		});

		it(`if multiple messages are queued, it should only start the serial API machine once`, () => {
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
			);
			service = interpret(testMachine).start();

			for (let i = 1; i <= 3; i++) {
				service.send({
					type: "add",
					transaction: createTransaction(
						dummyMessageNoResponseNoCallback,
					),
				});
				expect(service.state.value).toEqual("execute");
				expect(mockSerialAPIMachine).toBeCalledTimes(1);
			}
		});
	});

	describe(`executing a command`, () => {
		it("when it succeeds, it should go back to idle state, reset the current transaction and send its parent a success message with the result", (done) => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);
			testMachine.initial = "execute";
			// Wrap the test machine in a small wrapper machine to test sendParent
			const wrapper = createWrapperMachine(testMachine);
			service = interpret(wrapper).start();
			const childService = service.children.get("child") as Actor<
				CommandQueueContext,
				CommandQueueEvent
			>;

			service.onEvent((evt: any) => {
				if (evt.type === "success") {
					expect(evt.result).toBe("FOO");
					expect(evt.transaction).toBe(transaction);

					// no more messages
					expect(childService.state.value).toBe("idle");
					expect(
						childService.state.context.currentTransaction,
					).toBeUndefined();
					done();
				}
			});

			// Immediately resolve the command
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: "FOO",
				},
			} as any);
		});

		it("should call sendDataAbort and notify the parent machine if the callback of a SendData command times out", (done) => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);
			testMachine.initial = "execute";

			// Wrap the test machine in a small wrapper machine to test sendParent
			const wrapper = createWrapperMachine(testMachine);
			service = interpret(wrapper).start();
			const childService = service.children.get("child") as Actor<
				CommandQueueContext,
				CommandQueueEvent
			>;

			let ok = false;
			service.onEvent((evt: any) => {
				if (evt.type === "failure") {
					expect(evt.reason).toBe("callback timeout");
					expect(evt.transaction).toBe(transaction);
					if (ok) done();
					else ok = true;
				}
			});

			// Immediately resolve the command
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(childService.state.value).toEqual("abortSendData");
			expect(mockSerialAPIMachine).toBeCalledTimes(2);
			expect(mockSerialAPIMachine.mock.calls[1][0]).toBeInstanceOf(
				SendDataAbort,
			);

			service.send({
				type: "done.invoke.executeSendDataAbort",
				data: {
					type: "success",
				},
			} as any);

			expect(childService.state.value).toBe("idle");
			expect(
				childService.state.context.currentTransaction,
			).toBeUndefined();

			if (ok) done();
			else ok = true;
		});

		it("when it fails, it should go back to idle state, reset the current transaction and send its parent a failure message with the reason", (done) => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);
			testMachine.initial = "execute";
			// Wrap the test machine in a small wrapper machine to test sendParent
			const wrapper = createWrapperMachine(testMachine);
			service = interpret(wrapper).start();
			const childService = service.children.get("child") as Actor<
				CommandQueueContext,
				CommandQueueEvent
			>;

			service.onEvent((evt: any) => {
				if (evt.type === "failure") {
					expect(evt.reason).toBe("ACK timeout");
					expect(evt.transaction).toBe(transaction);

					// no more messages
					expect(childService.state.value).toBe("idle");
					expect(
						childService.state.context.currentTransaction,
					).toBeUndefined();
					done();
				}
			});

			// Immediately resolve the command
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);
		});
	});

	describe("aborting a SendData command", () => {
		it("when aborting fails, it should still go into idle state", async () => {
			const testMachine = createCommandQueueMachine(
				defaultImplementations,
			);
			testMachine.initial = "abortSendData";

			// Wrap the test machine in a small wrapper machine to test sendParent
			const wrapper = createWrapperMachine(testMachine);
			service = interpret(wrapper).start();
			const childService = service.children.get("child") as Actor<
				CommandQueueContext,
				CommandQueueEvent
			>;

			service.send({
				type: "done.invoke.executeSendDataAbort",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(childService.state.value).toBe("idle");
		});
	});
});
