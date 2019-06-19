import * as winston from "winston";
import { assertMessage, SpyTransport } from "../../../test/SpyTransport";
import log from "./index";
import { restoreSilence, unsilence } from "./shared";

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
		wasSilenced = unsilence(reflectionLogger);
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
		it("contains an outbound direction", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.startsWith(" »  "),
			});
		});

		it("logs a tag for the name", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[name]"),
			});
		});

		it("logs a secondary tag for the type", () => {
			log.reflection.define("name", "expectedResponse", "something else");
			assertMessage(spyTransport, {
				predicate: msg => msg.endsWith("[expectedResponse]"),
			});
		});
	});
});
