import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import * as winston from "winston";
import { createEmptyMockDriver } from "../../../test/mocks";
import { assertMessage, SpyTransport } from "../../../test/SpyTransport";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message } from "../message/Message";
import { driverLoggerFormat } from "./Driver";
import log from "./index";
import { BOX_CHARS, getDirectionPrefix } from "./shared";

interface CreateTransactionOptions {
	type: MessageType;
	functionType: FunctionType;
	priority: MessagePriority;
}
function createTransaction(
	options: Partial<CreateTransactionOptions>,
): Transaction {
	const driver = createEmptyMockDriver();
	const message = new Message(driver, {
		type: options.type || MessageType.Request,
		functionType: options.functionType || (0x00 as any),
	});
	const trns = new Transaction(
		driver,
		message,
		createDeferredPromise(),
		options.priority || MessagePriority.Controller,
	);
	trns.sendAttempts = 1;
	return trns;
}

describe.only("lib/log/Driver =>", () => {
	let driverLogger: winston.Logger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		driverLogger = winston.loggers.get("driver");
		spyTransport = new SpyTransport();
		driverLogger.configure({
			format: driverLoggerFormat,
			transports: [
				// Uncomment this to debug the log outputs manually
				new winston.transports.Console({ level: "silly" }),
				spyTransport,
			],
		});
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		driverLogger.configure({
			format: driverLoggerFormat,
			transports: [],
		});
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("logs outbound messages of a transaction correctly", () => {
		it("contains the direction", () => {
			log.driver.transaction("outbound", createTransaction({}));
			assertMessage(spyTransport, {
				predicate: msg =>
					msg.startsWith(getDirectionPrefix("outbound")),
			});
		});
		it("contains the message type as a tag", () => {
			log.driver.transaction(
				"outbound",
				createTransaction({ type: MessageType.Request }),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[REQ]"),
			});

			log.driver.transaction(
				"outbound",
				createTransaction({ type: MessageType.Response }),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			log.driver.transaction(
				"outbound",
				createTransaction({
					functionType: FunctionType.GetSerialApiInitData,
				}),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[GetSerialApiInitData]"),
			});
		});

		it("contains the message priority", () => {
			log.driver.transaction(
				"outbound",
				createTransaction({
					priority: MessagePriority.MultistepController,
				}),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[P: MultistepController]"),
			});
		});
	});

	describe("logs simple messages correctly", () => {
		it("short ones", () => {
			log.driver.print("Test");
			assertMessage(spyTransport, {
				message: `·   Test`,
			});
		});

		it("long ones", () => {
			log.driver.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} This is a very long message that should be broken into multiple lines maybe 
  ${BOX_CHARS.bottom} sometimes...`,
			});
		});
	});
});
