import winston from "winston";
import {
	assertLogInfo,
	assertMessage,
	SpyTransport,
} from "../../../test/SpyTransport";
import log from "./index";
import { restoreSilence } from "./shared";

describe("lib/log/Reflection =>", () => {
	let reflectionLogger: winston.Logger;
	let spyTransport: SpyTransport;
	let wasSilenced = true;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		// the loggers are lazy-loaded, so force loading
		void log.reflection;
		reflectionLogger = winston.loggers.get("reflection");
		spyTransport = new SpyTransport();
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(reflectionLogger);
		reflectionLogger.add(spyTransport);
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		reflectionLogger.remove(spyTransport);
		restoreSilence(reflectionLogger, wasSilenced);
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("define()", () => {
		it("contains no direction", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith("  "),
			});
		});

		it(`contains the word "defining"`, () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("defining"),
			});
		});

		it("contains the type", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("expectedResponse"),
			});
		});

		it("logs a tag for the name", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[name]"),
			});
		});

		it("contains the actual message", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("something else"),
			});
		});
	});

	describe("lookup()", () => {
		it("contains no direction", () => {
			log.reflection.lookup("name", "expectedResponse", "foo");
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith("  "),
			});
		});

		it(`contains the word "retrieving"`, () => {
			log.reflection.lookup("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("retrieving"),
			});
		});

		it("contains the type", () => {
			log.reflection.lookup("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("expectedResponse"),
			});
		});

		it("logs a tag for the name", () => {
			log.reflection.lookup("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[name]"),
			});
		});

		it("contains the actual message", () => {
			log.reflection.lookup("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("something else"),
			});
		});
	});

	describe("print()", () => {
		it("logs short messages correctly", () => {
			log.reflection.print("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("logs long messages correctly", () => {
			log.reflection.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
			});
		});

		it("logs with the given loglevel", () => {
			log.reflection.print("Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });
		});

		it("has a default loglevel of silly", () => {
			log.reflection.print("Test");
			assertLogInfo(spyTransport, { level: "silly" });
		});
	});
});
