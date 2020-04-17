import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import colors from "ansi-colors";
import MockDate from "mockdate";
import winston from "winston";
import { createEmptyMockDriver } from "../../../test/mocks";
import {
	assertLogInfo,
	assertMessage,
	SpyTransport,
} from "../../../test/SpyTransport";
import type { Driver } from "../driver/Driver";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message } from "../message/Message";
import { DRIVER_LABEL } from "./Driver";
import log from "./index";
import { getDirectionPrefix, restoreSilence } from "./shared";

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
	trns.sendAttempts = 1;
	return trns;
}

describe("lib/log/Driver =>", () => {
	let driverLogger: winston.Logger;
	let spyTransport: SpyTransport;
	const wasSilenced = true;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		// the loggers are lazy-loaded, so force loading
		void log.driver;
		driverLogger = winston.loggers.get("driver");
		spyTransport = new SpyTransport(DRIVER_LABEL);
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(driverLogger);
		driverLogger.add(spyTransport);

		MockDate.set(new Date().setHours(0, 0, 0, 0));
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		driverLogger.remove(spyTransport);
		restoreSilence(driverLogger, wasSilenced);
		MockDate.reset();
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("print()", () => {
		it("logs short messages correctly", () => {
			log.driver.print("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("logs long messages correctly", () => {
			log.driver.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
			});
		});

		it("logs with the given loglevel", () => {
			log.driver.print("Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });
		});

		it("has a default loglevel of verbose", () => {
			log.driver.print("Test");
			assertLogInfo(spyTransport, { level: "verbose" });
		});

		it("prefixes the messages with the current timestamp and channel name", () => {
			log.driver.print("Whatever");
			assertMessage(spyTransport, {
				message: `00:00:00.000 DRIVER   Whatever`,
				ignoreTimestamp: false,
				ignoreChannel: false,
			});
		});

		it("the timestamp is in a dim color", () => {
			log.driver.print("Whatever");
			assertMessage(spyTransport, {
				predicate: (msg) => msg.startsWith(colors.gray("00:00:00.000")),
				ignoreTimestamp: false,
				ignoreChannel: false,
				ignoreColor: false,
			});
		});

		it("the channel name is in inverted gray color", () => {
			log.driver.print("Whatever");
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
			log.driver.transaction(createTransaction({}));
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.startsWith(getDirectionPrefix("outbound")),
			});
		});
		it("contains the message type as a tag", () => {
			log.driver.transaction(
				createTransaction({ type: MessageType.Request }),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[REQ]"),
			});

			log.driver.transaction(
				createTransaction({ type: MessageType.Response }),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			log.driver.transaction(
				createTransaction({
					functionType: FunctionType.GetSerialApiInitData,
				}),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[GetSerialApiInitData]"),
			});
		});

		it("contains the message priority on the first attempt", () => {
			log.driver.transaction(
				createTransaction({
					priority: MessagePriority.MultistepController,
				}),
			);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[P: MultistepController]"),
			});
		});

		it("contains no message priority on further attempts", () => {
			const transaction = createTransaction({
				priority: MessagePriority.MultistepController,
			});
			transaction.sendAttempts = 2;
			log.driver.transaction(transaction);
			assertMessage(spyTransport, {
				predicate: (msg) => !msg.includes("[P: MultistepController]"),
			});
		});

		it("contains the number of send attempts after the first try", () => {
			const transaction = createTransaction({
				priority: MessagePriority.MultistepController,
			});
			transaction.sendAttempts = 2;
			transaction.maxSendAttempts = 3;
			log.driver.transaction(transaction);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[attempt 2/3]"),
			});
		});
	});

	describe("transactionResponse() (for inbound messages)", () => {
		it("contains the direction", () => {
			const msg = createMessage(fakeDriver, {});
			log.driver.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.startsWith(getDirectionPrefix("inbound")),
			});
		});

		it("contains the message type as a tag", () => {
			let msg = createMessage(fakeDriver, {
				type: MessageType.Request,
			});
			log.driver.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[REQ]"),
			});

			msg = createMessage(fakeDriver, {
				type: MessageType.Response,
			});
			log.driver.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			const msg = createMessage(fakeDriver, {
				functionType: FunctionType.HardReset,
			});
			log.driver.transactionResponse(msg, undefined, null as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[HardReset]"),
			});
		});

		it("contains the role (regarding the transaction) of the received message as a tag", () => {
			const msg = createMessage(fakeDriver, {
				functionType: FunctionType.HardReset,
			});
			log.driver.transactionResponse(msg, undefined, "fatal_controller");
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[fatal_controller]"),
			});
		});
	});

	describe("sendQueue()", () => {
		it("prints the send queue length", () => {
			const queue = new SortedList<Transaction>();
			log.driver.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(0 messages)"),
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			log.driver.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(1 message)"),
				callNumber: 1,
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			log.driver.sendQueue(queue);
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
			log.driver.sendQueue(queue);

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
			log.driver.sendQueue(queue);

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
			log.driver.transactionResponse(msg, undefined, null as any);

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
			log.driver.print(`This is a message [with] [inline] tags...`);

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
