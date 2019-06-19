import * as winston from "winston";
import {
	assertLogInfo,
	assertMessage,
	SpyTransport,
} from "../../../test/SpyTransport";
import { CommandClasses } from "../commandclass/CommandClasses";
import { ValueBaseArgs } from "../node/ValueDB";
import { controllerLoggerFormat } from "./Controller";
import log from "./index";
import { BOX_CHARS } from "./shared";

describe("lib/log/Controller =>", () => {
	let controllerLogger: winston.Logger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		controllerLogger = winston.loggers.get("controller");
		spyTransport = new SpyTransport();
		controllerLogger.configure({
			format: controllerLoggerFormat,
			transports: [
				// Uncomment this to debug the log outputs manually
				new winston.transports.Console({ level: "silly" }),
				spyTransport,
			],
		});
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		controllerLogger.configure({
			format: controllerLoggerFormat,
			transports: [],
		});
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("value()", () => {
		it("prints a short tag for the change type", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[+]"),
			});

			log.controller.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[~]"),
				callNumber: 1,
			});

			log.controller.value("removed", { ...baseArgs, prevValue: 7 });
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[-]"),
				callNumber: 2,
			});
		});

		it("prints a tag including the CC name", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Basic]"),
			});
		});

		it("prints a secondary tag including the CC endpoint", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: msg => !msg.includes("[Endpoint"),
			});

			log.controller.value("added", {
				...baseArgs,
				newValue: 1,
				endpoint: 5,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Endpoint 5]"),
				callNumber: 1,
			});
		});

		it("prints the name of the property", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			log.controller.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			log.controller.value("removed", { ...baseArgs, prevValue: 7 });
			for (let callNumber = 0; callNumber < 3; callNumber++) {
				assertMessage(spyTransport, {
					predicate: msg => msg.includes("foo"),
					callNumber,
				});
			}
		});

		it("prints the name and key of map-like properties", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "bar",
				propertyKey: "baz",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			log.controller.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			log.controller.value("removed", { ...baseArgs, prevValue: 7 });
			for (let callNumber = 0; callNumber < 3; callNumber++) {
				assertMessage(spyTransport, {
					predicate: msg => msg.includes("bar[baz]"),
					callNumber,
				});
			}
		});

		it("prints a the value change according to the change type", () => {
			const baseArgs: ValueBaseArgs = {
				commandClass: CommandClasses.Basic,
				propertyName: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: msg => msg.includes(": 1"),
			});

			log.controller.value("updated", {
				...baseArgs,
				prevValue: false,
				newValue: "asdf",
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes(`: false => "asdf"`),
				callNumber: 1,
			});

			log.controller.value("removed", {
				...baseArgs,
				prevValue: 5,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("(was 5)"),
				callNumber: 2,
			});
		});
	});

	describe("print()", () => {
		it("logs short messages correctly", () => {
			log.controller.print("Test");
			assertMessage(spyTransport, {
				message: `·   Test`,
			});
		});

		it("logs long messages correctly", () => {
			log.controller.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `· ${BOX_CHARS.top} This is a very long message that should be broken into multiple lines maybe 
  ${BOX_CHARS.bottom} sometimes...`,
			});
		});

		it("logs with the given loglevel", () => {
			log.controller.print("Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });
		});

		it("has a default loglevel of info", () => {
			log.controller.print("Test");
			assertLogInfo(spyTransport, { level: "info" });
		});
	});
});
