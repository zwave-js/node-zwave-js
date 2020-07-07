import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { interpret, Interpreter } from "xstate";
import { SimulatedClock } from "xstate/lib/SimulatedClock";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
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

function createTransaction(msg: Message) {
	return new Transaction(
		{} as any,
		msg,
		createDeferredPromise(),
		MessagePriority.Normal,
	);
}

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

	beforeEach(() => {
		mockSerialAPIMachine.mockReset();
	});

	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	it(`should start in the idle state`, () => {
		const testMachine = createSendThreadMachine({
			sendData: createSendDataResolvesNever(),
		});
		service = interpret(testMachine).start();
		expect(service.state.value).toBe("idle");
	});

	describe(`when the machine is idle, ...`, () => {
		it(`should go into "execute" state when a message is queued`, () => {
			const testMachine = createSendThreadMachine({
				sendData: createSendDataResolvesNever(),
			});
			service = interpret(testMachine).start();

			service.send({
				type: "add",
				transaction: createTransaction(
					dummyMessageNoResponseNoCallback,
				),
			});
			expect(service.state.value).toBe("execute");
			expect(mockSerialAPIMachine).toBeCalledTimes(1);
		});

		it(`if multiple messages are queued, it should only start the serial API machine once`, () => {
			const testMachine = createSendThreadMachine({
				sendData: createSendDataResolvesNever(),
			});
			service = interpret(testMachine).start();

			for (let i = 1; i <= 3; i++) {
				service.send({
					type: "add",
					transaction: createTransaction(
						dummyMessageNoResponseNoCallback,
					),
				});
				expect(service.state.value).toBe("execute");
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
				{
					sendData: createSendDataResolvesNever(),
				},
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "execute";
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
				{
					sendData: createSendDataResolvesNever(),
				},
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "execute";
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
				{
					sendData: createSendDataResolvesNever(),
				},
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "execute";
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
				{
					sendData: createSendDataResolvesNever(),
				},
				{
					queue: new SortedList([transaction]),
				},
			);

			testMachine.initial = "execute";
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
});
