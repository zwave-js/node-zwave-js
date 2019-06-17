import * as winston from "winston";
import { createEmptyMockDriver } from "../../../test/mocks";
import { assertMessage, SpyTransport } from "../../../test/SpyTransport";
import { FunctionType, MessageType } from "../message/Constants";
import { Message } from "../message/Message";
import { driverLoggerFormat } from "./Driver";
import log from "./index";
import { BOX_CHARS, getDirectionPrefix } from "./shared";

function createMessage(type: MessageType, functionType: FunctionType): Message {
	const driver = createEmptyMockDriver();
	return new Message(driver, { type, functionType });
}

describe("lib/log/Driver =>", () => {
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
				// new winston.transports.Console({ level: "silly" }),
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

	describe("logs message classes correctly", () => {
		it("contains the direction", () => {
			log.driver.message(
				"inbound",
				createMessage(MessageType.Request, 0x00 as any),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith(getDirectionPrefix("inbound")),
			});

			log.driver.message(
				"outbound",
				createMessage(MessageType.Request, 0x00 as any),
			);
			assertMessage(spyTransport, {
				predicate: msg =>
					msg.startsWith(getDirectionPrefix("outbound")),
				callNumber: 1,
			});
		});
		it("contains the message type as a tag", () => {
			log.driver.message(
				"inbound",
				createMessage(MessageType.Request, 0x00 as any),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[REQ]"),
			});

			log.driver.message(
				"inbound",
				createMessage(MessageType.Response, 0x00 as any),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[RES]"),
				callNumber: 1,
			});
		});

		it("contains the function type as a tag", () => {
			log.driver.message(
				"inbound",
				createMessage(
					MessageType.Request,
					FunctionType.GetSerialApiInitData,
				),
			);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[GetSerialApiInitData]"),
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
