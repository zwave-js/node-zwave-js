import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import * as colors from "ansi-colors";
import * as MockDate from "mockdate";
import * as winston from "winston";
import { createEmptyMockDriver } from "../../../test/mocks";
import {
	assertLogInfo,
	assertMessage,
	SpyTransport,
} from "../../../test/SpyTransport";
import { Driver } from "../driver/Driver";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message } from "../message/Message";
import log from "./index";
import {
	BOX_CHARS,
	getDirectionPrefix,
	restoreSilence,
	unsilence,
} from "./shared";

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
	const driver = createEmptyMockDriver();
	const message = createMessage(driver, options);
	const trns = new Transaction(
		driver,
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
	let wasSilenced = true;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		// the loggers are lazy-loaded, so force loading
		void log.driver;
		driverLogger = winston.loggers.get("driver");
		spyTransport = new SpyTransport();
		// Uncomment this to debug the log outputs manually
		wasSilenced = unsilence(driverLogger);
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
				message: `·   Test`,
			});
		});

		it("logs long messages correctly", () => {
			log.driver.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} This is a very long message that should be broken into multiple lines maybe 
  ${BOX_CHARS.bottom} sometimes...`,
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
				message: `00:00:00.000 DRIVER ·   Whatever`,
				ignoreTimestamp: false,
				ignoreChannel: false,
			});
		});

		it("the timestamp is in a dim color", () => {
			log.driver.print("Whatever");
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith(colors.gray("00:00:00.000")),
				ignoreTimestamp: false,
				ignoreChannel: false,
				ignoreColor: false,
			});
		});

		it("the channel name is in inverted primary color", () => {
			log.driver.print("Whatever");
			assertMessage(spyTransport, {
				predicate: msg =>
					msg.startsWith(colors.inverse(colors.gray("DRIVER"))),
				ignoreChannel: false,
				ignoreColor: false,
			});
		});
	});

	describe("transaction() (for outbound messages)", () => {
		it("contains the direction", () => {
			log.driver.transaction(createTransaction({}));
			assertMessage(spyTransport, {
				predicate: msg =>
					msg.startsWith(getDirectionPrefix("outbound")),
			});
		});
		it("contains the message type as a tag", () => {
			log.driver.transaction(
				createTransaction({ type: MessageType.Request }),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[REQ]"),
			});

			log.driver.transaction(
				createTransaction({ type: MessageType.Response }),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[RES]"),
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
				predicate: msg => msg.includes("[GetSerialApiInitData]"),
			});
		});

		it("contains the message priority on the first attempt", () => {
			log.driver.transaction(
				createTransaction({
					priority: MessagePriority.MultistepController,
				}),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[P: MultistepController]"),
			});
		});

		it("contains no message priority on further attempts", () => {
			const transaction = createTransaction({
				priority: MessagePriority.MultistepController,
			});
			transaction.sendAttempts = 2;
			log.driver.transaction(transaction);
			assertMessage(spyTransport, {
				predicate: msg => !msg.includes("[P: MultistepController]"),
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
				predicate: msg => msg.includes("[attempt 2/3]"),
			});
		});
	});

	describe("transactionResponse() (for inbound messages)", () => {
		it("contains the direction", () => {
			const msg = createMessage(createEmptyMockDriver(), {});
			log.driver.transactionResponse(msg, null as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith(getDirectionPrefix("inbound")),
			});
		});

		it("contains the message type as a tag", () => {
			let msg = createMessage(createEmptyMockDriver(), {
				type: MessageType.Request,
			});
			log.driver.transactionResponse(msg, null as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[REQ]"),
			});

			msg = createMessage(createEmptyMockDriver(), {
				type: MessageType.Response,
			});
			log.driver.transactionResponse(msg, null as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			const msg = createMessage(createEmptyMockDriver(), {
				functionType: FunctionType.HardReset,
			});
			log.driver.transactionResponse(msg, null as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[HardReset]"),
			});
		});

		it("contains the role (regarding the transaction) of the received message as a tag", () => {
			const msg = createMessage(createEmptyMockDriver(), {
				functionType: FunctionType.HardReset,
			});
			log.driver.transactionResponse(msg, "fatal_controller");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[fatal_controller]"),
			});
		});
	});

	describe("sendQueue()", () => {
		it("prints the send queue length", () => {
			const queue = new SortedList<Transaction>();
			log.driver.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("(0 messages)"),
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			log.driver.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("(1 message)"),
				callNumber: 1,
			});

			queue.add(
				createTransaction({ functionType: FunctionType.GetSUCNodeId }),
			);
			log.driver.sendQueue(queue);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("(2 messages)"),
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

			// Each line should be indented
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("  GetSUCNodeId"),
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("  HardReset"),
			});
		});
	});
});
