import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { interpret, Interpreter } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { BasicCCGet, BasicCCSet } from "../commandclass/BasicCC";
import { SendDataAbort, SendDataRequest } from "../controller/SendDataMessages";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import type { Driver } from "./Driver";
import {
	createSendThreadMachine,
	SendThreadContext,
	SendThreadEvent,
	SendThreadStateSchema,
} from "./SendThreadMachine";
import {
	createSendDataResolvesImmediately,
	createSendDataResolvesNever,
	dummyMessageNoResponseNoCallback,
} from "./testUtils";
import { Transaction } from "./Transaction";

jest.mock("./SerialAPICommandMachine");
const mockSerialAPIMachine = jest.requireMock("./SerialAPICommandMachine")
	.createSerialAPICommandMachine as jest.Mock;

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

const sendDataBasicSet = new SendDataRequest(fakeDriver, {
	command: new BasicCCSet(fakeDriver, {
		nodeId: 2,
		targetValue: 1,
	}),
});
const sendDataBasicGet = new SendDataRequest(fakeDriver, {
	command: new BasicCCGet(fakeDriver, { nodeId: 2 }),
});

const defaultImplementations = {
	sendData: createSendDataResolvesNever(),
	createSendDataAbort: () => new SendDataAbort(fakeDriver),
};

describe("lib/driver/SendThreadMachine", () => {
	jest.setTimeout(100);

	let service:
		| undefined
		| Interpreter<
				SendThreadContext,
				SendThreadStateSchema,
				SendThreadEvent,
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

	it(`should start in the idle state`, () => {
		const testMachine = createSendThreadMachine(defaultImplementations);
		service = interpret(testMachine).start();
		expect(service.state.value).toBe("idle");
	});

	describe(`when the machine is idle, ...`, () => {
		it(`should go into "execute" state when a message is queued`, () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			service.send({
				type: "add",
				transaction: createTransaction(
					dummyMessageNoResponseNoCallback,
				),
			});
			expect(service.state.value).toEqual({ sending: "execute" });
			expect(mockSerialAPIMachine).toBeCalledTimes(1);
		});

		it(`if multiple messages are queued, it should only start the serial API machine once`, () => {
			const testMachine = createSendThreadMachine(defaultImplementations);
			service = interpret(testMachine).start();

			for (let i = 1; i <= 3; i++) {
				service.send({
					type: "add",
					transaction: createTransaction(
						dummyMessageNoResponseNoCallback,
					),
				});
				expect(service.state.value).toEqual({ sending: "execute" });
				expect(mockSerialAPIMachine).toBeCalledTimes(1);
			}
		});
	});

	describe(`executing a command`, () => {
		it("when it succeeds, it should go back to idle state and the transaction should be resolved with the result", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: "FOO",
				},
			} as any);

			const result = await transaction.promise;
			expect(result).toBe("FOO");

			// no more messages
			expect(service.state.value).toBe("idle");
		});

		it("when it fails, it should go back to idle state and the transaction should be rejected with the reason", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_Timeout,
			});

			// no more messages
			expect(service.state.value).toBe("idle");
		});

		it("when it fails due to NOK response, that message should be the error context", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			const result = { isOK: () => false };
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "response NOK",
					result,
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_ResponseNOK,
				context: result,
			});
		});

		it("when it fails due to NOK callback, that message should be the error context", async () => {
			const transaction = createTransaction(
				dummyMessageNoResponseNoCallback,
			);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			const result = { isOK: () => false };
			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback NOK",
					result,
				},
			} as any);

			await assertZWaveError(() => transaction.promise, {
				errorCode: ZWaveErrorCodes.Controller_CallbackNOK,
				context: result,
			});
		});

		it("should only execute subsequent commands once the previous one was completed", async () => {
			const t1 = createTransaction(dummyMessageNoResponseNoCallback);
			const t2 = createTransaction(dummyMessageNoResponseNoCallback);
			const testMachine = createSendThreadMachine({
				...defaultImplementations,
				sendData: createSendDataResolvesImmediately(),
			});
			const clock = new SimulatedClock();
			service = interpret(testMachine, { clock }).start();

			mockSerialAPIMachine
				.mockImplementationOnce(() => {
					setImmediate(() => {
						service!.send({
							type: "done.invoke.execute",
							data: {
								type: "success",
								result: 1,
							},
						} as any);
					});
				})
				.mockImplementationOnce(() => {
					setImmediate(() => {
						service!.send({
							type: "done.invoke.execute",
							data: {
								type: "success",
								result: 2,
							},
						} as any);
					});
				});

			service.send({ type: "add", transaction: t1 });
			service.send({ type: "add", transaction: t2 });

			clock.increment(100);

			expect(mockSerialAPIMachine).toBeCalledTimes(1);
			await expect(t1.promise).resolves.toBe(1);

			clock.increment(100);

			expect(mockSerialAPIMachine).toBeCalledTimes(2);
			await expect(t2.promise).resolves.toBe(2);
		});
	});

	describe(`executing a SendData command`, () => {
		it("should go into retryWait state if it fails", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("should abort sending if the callback times out", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "abortSendData" });
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

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("when aborting fails, it should still go into retryWait state", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "abortSendData";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.executeSendDataAbort",
				data: {
					type: "failure",
					reason: "callback timeout",
				},
			} as any);

			expect(service.state.value).toEqual({ sending: "retryWait" });
		});

		it("should go into waitForUpdate state if it succeeds and expects an update", async () => {
			const transaction = createTransaction(sendDataBasicGet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "success",
					result: 1,
				},
			} as any);

			expect(
				(service.state.value as any).sending.waitForUpdate,
			).toBeObject();
		});
	});

	describe("retrying a SendData command...", () => {
		it("should reject the transaction and go back to idle if there are no attempts left", async () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: sendDataBasicSet.maxSendAttempts - 1,
				},
			);

			testMachine.initial = "sending";
			service = interpret(testMachine).start();

			service.send({
				type: "done.invoke.execute",
				data: {
					type: "failure",
					reason: "ACK timeout",
				},
			} as any);

			await assertZWaveError(() => transaction.promise);

			expect(service.state.value).toEqual("idle");
		});

		it("should wait until sending again", () => {
			const transaction = createTransaction(sendDataBasicSet);
			const testMachine = createSendThreadMachine(
				defaultImplementations,
				{
					queue: new SortedList([transaction]),
					sendDataAttempts: 0,
				},
			);

			const clock = new SimulatedClock();

			testMachine.initial = "sending";
			testMachine.states.sending.initial = "retry";
			service = interpret(testMachine, { clock }).start();

			expect(service.state.value).toEqual({ sending: "retryWait" });

			// The wait time is 500ms
			clock.increment(499);
			expect(service.state.value).toEqual({ sending: "retryWait" });
			clock.increment(1);
			expect(service.state.value).toEqual({ sending: "execute" });
		});

		// it("should notify us about the retry attempt", () => {
		// 	const onRetry = jest.fn();
		// 	const testMachine = createSerialAPICommandMachine(
		// 		{} as any,
		// 		{
		// 			sendData: createSendDataResolvesNever(),
		// 			notifyRetry: onRetry,
		// 		},
		// 		{ attempts: 2 },
		// 	);
		// 	testMachine.initial = "retry";

		// 	const clock = new SimulatedClock();
		// 	service = interpret(testMachine, { clock }).start();
		// 	clock.increment(1100);
		// 	expect(onRetry).toBeCalledWith(2, 3, 1100);
		// });
	});
});
