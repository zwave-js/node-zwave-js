import {
	createDefaultTransportFormat,
	getDirectionPrefix,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { assertLogInfo, assertMessage, SpyTransport } from "@zwave-js/testing";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import colors from "ansi-colors";
import MockDate from "mockdate";
import type { Driver } from "../driver/Driver";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message } from "../message/Message";
import { createEmptyMockDriver } from "../test/mocks";
import { DriverLogger } from "./Driver";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

interface CreateMessageOptions {
	type: MessageType;
	functionType: FunctionType;
}

interface CreateTransactionOptions extends CreateMessageOptions {
	priority: MessagePriority;
}

function createMessage(
	driver: Driver,
	options: Partial<CreateTransactionOptions>,
) {
	return new Message(driver, {
		type: options.type || MessageType.Request,
		functionType: options.functionType || (0x00 as any),
	});
}

function createTransaction(
	options: Partial<CreateTransactionOptions>,
): Transaction {
	const message = createMessage(fakeDriver, options);
	const trns = new Transaction(
		fakeDriver,
		message,
		createDeferredPromise(),
		options.priority || MessagePriority.Controller,
	);
	return trns;
}

describe("lib/log/Driver =>", () => {
	let driverLogger: DriverLogger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		spyTransport = new SpyTransport();
		spyTransport.format = createDefaultTransportFormat(true, true);
		driverLogger = new DriverLogger(
			new ZWaveLogContainer({
				transports: [spyTransport],
			}),
		);
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(driverLogger);

		MockDate.set(new Date().setHours(0, 0, 0, 0));
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		driverLogger.container.updateConfiguration({ enabled: false });
		MockDate.reset();
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("print()", () => {
		it("logs short messages correctly", () => {
			driverLogger.print("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("logs long messages correctly", () => {
			driverLogger.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
			});
		});

		it("logs with the given loglevel", () => {
			driverLogger.print("Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });
		});

		it("has a default loglevel of verbose", () => {
			driverLogger.print("Test");
			assertLogInfo(spyTransport, { level: "verbose" });
		});

		it("prefixes the messages with the current timestamp and channel name", () => {
			driverLogger.print("Whatever");
			assertMessage(spyTransport, {
				message: `00:00:00.000 DRIVER   Whatever`,
				ignoreTimestamp: false,
				ignoreChannel: false,
			});
		});

		it("the timestamp is in a dim color", () => {
			driverLogger.print("Whatever");
			assertMessage(spyTransport, {
				predicate: (msg) => msg.startsWith(colors.gray("00:00:00.000")),
				ignoreTimestamp: false,
				ignoreChannel: false,
				ignoreColor: false,
			});
		});

		it("the channel name is in inverted gray color", () => {
			driverLogger.print("Whatever");
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.startsWith(colors.gray.inverse("DRIVER")),
				ignoreChannel: false,
				ignoreColor: false,
			});
		});
	});

	describe("transaction() (for outbound messages)", () => {
		it("contains the direction", () => {
			driverLogger.transaction(createTransaction({}));
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.startsWith(getDirectionPrefix("outbound")),
			});
		});
		it("contains the message type as a tag", () => {
			driverLogger.transaction(
				createTransaction({ type: MessageType.Request }),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[REQ]"),
			});

			driverLogger.transaction(
				createTransaction({ type: MessageType.Response }),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			driverLogger.transaction(
				createTransaction({
					functionType: FunctionType.GetSerialApiInitData,
				}),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[GetSerialApiInitData]"),
			});
		});

		it("contains the message priority", () => {
			driverLogger.transaction(
				createTransaction({
					priority: MessagePriority.MultistepController,
				}),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[P: MultistepController]"),
			});
		});

		// it("contains no message priority on further attempts", () => {
		// 	const transaction = createTransaction({
		// 		priority: MessagePriority.MultistepController,
		// 	});
		// 	transaction.sendAttempts = 2;
		// 	driverLogger.transaction(transaction);
		// 	assertMessage(spyTransport, {
		// 		predicate: (msg) => !msg.includes("[P: MultistepController]"),
		// 	});
		// });

		// it("contains the number of send attempts after the first try", () => {
		// 	const transaction = createTransaction({
		// 		priority: MessagePriority.MultistepController,
		// 	});
		// 	transaction.sendAttempts = 2;
		// 	transaction.maxSendAttempts = 3;
		// 	driverLogger.transaction(transaction);
		// 	assertMessage(spyTransport, {
		// 		predicate: (msg) => msg.includes("[attempt 2/3]"),
		// 	});
		// });
	});

	describe("transactionResponse() (for inbound messages)", () => {
		it("contains the direction", () => {
			const msg = createMessage(fakeDriver, {});
			driverLogger.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.startsWith(getDirectionPrefix("inbound")),
			});
		});

		it("contains the message type as a tag", () => {
			let msg = createMessage(fakeDriver, {
				type: MessageType.Request,
			});
			driverLogger.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[REQ]"),
			});

			msg = createMessage(fakeDriver, {
				type: MessageType.Response,
			});
			driverLogger.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			const msg = createMessage(fakeDriver, {
				functionType: FunctionType.HardReset,
			});
			driverLogger.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[HardReset]"),
			});
		});

		it("contains the role (regarding the transaction) of the received message as a tag", () => {
			const msg = createMessage(fakeDriver, {
				functionType: FunctionType.HardReset,
			});
			driverLogger.transactionResponse(
				msg,
				undefined,
				"fatal_controller",
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[fatal_controller]"),
			});
		});
	});

	describe("sendQueue()", () => {
		it("prints the send queue length", () => {
			const queue = new SortedList<Transaction>();
			driverLogger.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(0 messages)"),
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			driverLogger.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(1 message)"),
				callNumber: 1,
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			driverLogger.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(2 messages)"),
				callNumber: 2,
			});
		});

		it("prints the function type for each message", () => {
			const queue = new SortedList<Transaction>();
			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			queue.add(
				createTransaction({ functionType: FunctionType.HardReset }),
			);
			driverLogger.sendQueue(queue);

			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("GetSUCNodeId"),
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("HardReset"),
			});
		});

		it("prints the message type for each message", () => {
			const queue = new SortedList<Transaction>();
			queue.add(
				createTransaction({
					functionType: FunctionType.GetSUCNodeId,
					type: MessageType.Request,
				}),
			);
			queue.add(
				createTransaction({
					functionType: FunctionType.HardReset,
					type: MessageType.Response,
				}),
			);
			driverLogger.sendQueue(queue);

			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("· [REQ] GetSUCNodeId"),
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("· [RES] HardReset"),
			});
		});
	});

	describe("colors", () => {
		it("primary tags are printed in inverse colors", () => {
			const msg = createMessage(fakeDriver, {
				functionType: FunctionType.HardReset,
				type: MessageType.Response,
			});
			driverLogger.transactionResponse(msg, undefined, null as any);

			const expected1 = colors.cyan(
				colors.bgCyan("[") +
					colors.inverse("RES") +
					colors.bgCyan("]") +
					" " +
					colors.bgCyan("[") +
					colors.inverse("HardReset") +
					colors.bgCyan("]"),
			);

			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes(expected1),
				ignoreColor: false,
			});
		});

		it("inline tags are printed in inverse colors", () => {
			driverLogger.print(`This is a message [with] [inline] tags...`);

			const expected1 =
				colors.bgCyan("[") +
				colors.inverse("with") +
				colors.bgCyan("]") +
				" " +
				colors.bgCyan("[") +
				colors.inverse("inline") +
				colors.bgCyan("]");

			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes(expected1),
				ignoreColor: false,
			});
		});
	});
});
