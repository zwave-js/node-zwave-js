import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { interpret, Interpreter } from "xstate";
import { MessagePriority } from "../message/Constants";
import type { Message } from "../message/Message";
import {
	createSendThreadMachine,
	SendThreadContext,
	SendThreadEvent,
	SendThreadStateSchema,
} from "./SendThreadMachine";
import { Transaction } from "./Transaction";

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
	afterEach(() => {
		service?.stop();
		service = undefined;
	});

	it(`should start in the empty state`, () => {
		const testMachine = createSendThreadMachine({} as any);
		service = interpret(testMachine).start();
		expect(service.state.value).toBe("empty");
	});

	describe(`when the queue is empty, ...`, () => {
		it(`should go into "transaction" state when a message is queued`, () => {
			const testMachine = createSendThreadMachine({} as any);
			service = interpret(testMachine).start();

			service.send({
				type: "add",
				transaction: createTransaction({} as any),
			});
			expect(service.state.value).toBe("transaction");
		});
	});
});
