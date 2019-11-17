import winston from "winston";
import {
	assertLogInfo,
	assertMessage,
	SpyTransport,
} from "../../../test/SpyTransport";
import { CommandClasses } from "../commandclass/CommandClasses";
import { InterviewStage } from "../node/INode";
import log from "./index";
import { restoreSilence } from "./shared";

describe("lib/log/Controller =>", () => {
	let controllerLogger: winston.Logger;
	let spyTransport: SpyTransport;
	const wasSilenced = true;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		// the loggers are lazy-loaded, so force loading
		void log.controller;
		controllerLogger = winston.loggers.get("controller");
		spyTransport = new SpyTransport();
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(controllerLogger);
		controllerLogger.add(spyTransport);
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		controllerLogger.remove(spyTransport);
		restoreSilence(controllerLogger, wasSilenced);
	});

	beforeEach(() => {
		spyTransport.spy.mockClear();
	});

	describe("value()", () => {
		it("prints a short tag for the change type", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
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
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Basic]"),
			});
		});

		it("prints a tag including the Node ID", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.value("added", {
				...baseArgs,
				nodeId: 5,
				newValue: 1,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Node 005]"),
			});
		});

		it("prints a secondary tag including the CC endpoint", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
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

		it("prints a secondary tag if the value is internal", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "interviewComplete",
			};

			log.controller.value("added", {
				...baseArgs,
				newValue: true,
				internal: true,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[internal]"),
			});

			log.controller.value("added", {
				...baseArgs,
				newValue: true,
			});
			assertMessage(spyTransport, {
				predicate: msg => !msg.includes("[internal]"),
				callNumber: 1,
			});
		});

		it("prints the name of the property", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
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
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "bar",
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
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
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

	describe("metadata()", () => {
		it("prints a tag including the CC name", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Basic]"),
			});
		});

		it("prints a tag including the Node ID", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.metadataUpdated({
				...baseArgs,
				nodeId: 5,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Node 005]"),
			});
		});

		it("prints a secondary tag including the CC endpoint", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: msg => !msg.includes("[Endpoint"),
			});

			log.controller.metadataUpdated({
				...baseArgs,
				endpoint: 5,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Endpoint 5]"),
				callNumber: 1,
			});
		});

		it("prints a secondary tag if the value is internal", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "interviewComplete",
			};

			log.controller.metadataUpdated({
				...baseArgs,
				internal: true,
			});
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[internal]"),
			});

			log.controller.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: msg => !msg.includes("[internal]"),
				callNumber: 1,
			});
		});

		it("prints the name of the property", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("foo"),
			});
		});

		it("prints the change type", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			log.controller.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: msg => msg.endsWith(": metadata updated"),
			});
		});
	});

	describe("interviewStage()", () => {
		it("includes a tag for the node ID", () => {
			log.controller.interviewStage({ id: 7 } as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Node 007]"),
			});
		});

		it("logs the name of the interview stage", () => {
			log.controller.interviewStage({
				id: 1,
				interviewStage: InterviewStage.Configuration,
			} as any);
			assertMessage(spyTransport, {
				predicate: msg =>
					msg.includes("Interview stage completed: Configuration"),
			});
		});

		it("prints a custom message when the interview is complete", () => {
			log.controller.interviewStage({
				id: 5,
				interviewStage: InterviewStage.Complete,
			} as any);
			assertMessage(spyTransport, {
				message: "  [Node 005] Interview completed",
			});
		});
	});

	describe("interviewStart()", () => {
		it("includes a tag for the node ID", () => {
			log.controller.interviewStart({ id: 7 } as any);
			assertMessage(spyTransport, {
				predicate: msg => msg.includes("[Node 007]"),
			});
		});

		it("logs the name of the last interview stage", () => {
			log.controller.interviewStart({
				id: 5,
				interviewStage: InterviewStage.Configuration,
			} as any);
			assertMessage(spyTransport, {
				message:
					"  [Node 005] Beginning interview - last completed stage: Configuration",
			});
		});
	});

	describe("logNode()", () => {
		it("logs short messages correctly", () => {
			log.controller.logNode(3, "Test");
			assertMessage(spyTransport, {
				message: `  [Node 003] Test`,
			});

			log.controller.logNode(3, { message: "Test2" });
			assertMessage(spyTransport, {
				message: `  [Node 003] Test2`,
				callNumber: 1,
			});
		});

		it("logs long messages correctly", () => {
			log.controller.logNode(
				3,
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  [Node 003] This is a very long message that should be broken into multiple lin
  es maybe sometimes...`,
			});

			log.controller.logNode(5, {
				message:
					"This is a very long message that should be broken into multiple lines maybe sometimes...",
			});
			assertMessage(spyTransport, {
				message: `  [Node 005] This is a very long message that should be broken into multiple lin
  es maybe sometimes...`,
				callNumber: 1,
			});
		});

		it("logs with the given loglevel", () => {
			log.controller.logNode(1, "Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });

			log.controller.logNode(1, {
				message: "Test",
				level: "warn",
			});
			assertLogInfo(spyTransport, { level: "warn", callNumber: 1 });
		});

		it("has a default loglevel of info", () => {
			log.controller.logNode(3, "Test");
			assertLogInfo(spyTransport, { level: "info" });

			log.controller.logNode(3, { message: "Test" });
			assertLogInfo(spyTransport, { level: "info", callNumber: 1 });
		});

		it("logs the direction prefix", () => {
			log.controller.logNode(3, {
				message: "Test",
				direction: "inbound",
			});
			assertMessage(spyTransport, {
				message: "« [Node 003] Test",
			});
			log.controller.logNode(5, {
				message: "Test",
				direction: "outbound",
			});
			assertMessage(spyTransport, {
				message: "» [Node 005] Test",
				callNumber: 1,
			});
		});
	});

	describe("print()", () => {
		it("logs short messages correctly", () => {
			log.controller.print("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("logs long messages correctly", () => {
			log.controller.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
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
