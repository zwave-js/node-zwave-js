import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import { interpret, Interpreter } from "xstate";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import {
	createSendThreadMachine,
	SendThreadContext,
	SendThreadEvent,
	SendThreadStateSchema,
} from "./SendThreadMachine";
import {
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

	it(`should start in the empty state`, () => {
		const testMachine = createSendThreadMachine({
			sendData: createSendDataResolvesNever(),
		});
		service = interpret(testMachine).start();
		expect(service.state.value).toBe("empty");
	});

	describe(`when the queue is empty, ...`, () => {
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
	});

	describe(`executing a command`, () => {
		it("when it succeeds, it should go back to idle/empty state and the transaction should be resolved with the result", async () => {
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
			expect(service.state.value).toBe("empty");
		});

		it("when it fails, it should go back to idle/empty state and the transaction should be rejected with the reason", async () => {
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
			expect(service.state.value).toBe("empty");
		});
	});
});
