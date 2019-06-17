import * as winston from "winston";
import { assertMessage, SpyTransport } from "../../../test/SpyTransport";
import { driverLoggerFormat } from "./Driver";
import log from "./index";
import { BOX_CHARS } from "./shared";

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

	describe("logs simple messages correctly", () => {
		it("short ones", () => {
			log.driver.message("Test");
			assertMessage(spyTransport, {
				message: `·   Test`,
			});
		});

		it("long ones", () => {
			log.driver.message(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} This is a very long message that should be broken into multiple lines maybe 
  ${BOX_CHARS.bottom} sometimes...`,
			});
		});
	});
});
