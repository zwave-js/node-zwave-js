import {
	CommandClasses,
	createDefaultTransportFormat,
	ZWaveLogContainer,
} from "@zwave-js/core";
import { assertLogInfo, assertMessage, SpyTransport } from "@zwave-js/testing";
import { InterviewStage } from "../node/Types";
import { ControllerLogger } from "./Controller";

describe("lib/log/Controller =>", () => {
	let controllerLogger: ControllerLogger;
	let spyTransport: SpyTransport;

	// Replace all defined transports with a spy transport
	beforeAll(() => {
		spyTransport = new SpyTransport();
		spyTransport.format = createDefaultTransportFormat(true, true);
		controllerLogger = new ControllerLogger(
			new ZWaveLogContainer({
				transports: [spyTransport],
			}),
		);
		// Uncomment this to debug the log outputs manually
		// wasSilenced = unsilence(controllerLogger);
	});

	// Don't spam the console when performing the other tests not related to logging
	afterAll(() => {
		controllerLogger.container.updateConfiguration({ enabled: false });
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

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[+]"),
			});

			controllerLogger.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[~]"),
				callNumber: 1,
			});

			controllerLogger.value("removed", { ...baseArgs, prevValue: 7 });
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[-]"),
				callNumber: 2,
			});
		});

		it("prints a tag including the CC name", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Basic]"),
			});
		});

		it("prints a tag including the Node ID", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.value("added", {
				...baseArgs,
				nodeId: 5,
				newValue: 1,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Node 005]"),
			});
		});

		it("prints a secondary tag including the CC endpoint", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: (msg) => !msg.includes("[Endpoint"),
			});

			controllerLogger.value("added", {
				...baseArgs,
				newValue: 1,
				endpoint: 5,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Endpoint 5]"),
				callNumber: 1,
			});
		});

		it("prints a secondary tag if the value is internal", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "interviewComplete",
			};

			controllerLogger.value("added", {
				...baseArgs,
				newValue: true,
				internal: true,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[internal]"),
			});

			controllerLogger.value("added", {
				...baseArgs,
				newValue: true,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => !msg.includes("[internal]"),
				callNumber: 1,
			});
		});

		it("prints the name of the property", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			controllerLogger.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			controllerLogger.value("removed", { ...baseArgs, prevValue: 7 });
			for (let callNumber = 0; callNumber < 3; callNumber++) {
				assertMessage(spyTransport, {
					predicate: (msg) => msg.includes("foo"),
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

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			controllerLogger.value("updated", {
				...baseArgs,
				prevValue: 7,
				newValue: 1,
			});
			controllerLogger.value("removed", { ...baseArgs, prevValue: 7 });
			for (let callNumber = 0; callNumber < 3; callNumber++) {
				assertMessage(spyTransport, {
					predicate: (msg) => msg.includes("bar[baz]"),
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

			controllerLogger.value("added", { ...baseArgs, newValue: 1 });
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes(": 1"),
			});

			controllerLogger.value("updated", {
				...baseArgs,
				prevValue: false,
				newValue: "asdf",
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes(`: false => "asdf"`),
				callNumber: 1,
			});

			controllerLogger.value("removed", {
				...baseArgs,
				prevValue: 5,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("(was 5)"),
				callNumber: 2,
			});
		});

		it("stringifies objects", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.value("added", {
				...baseArgs,
				newValue: { foo: "bar" },
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes(`{"foo":"bar"}`),
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

			controllerLogger.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Basic]"),
			});
		});

		it("prints a tag including the Node ID", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.metadataUpdated({
				...baseArgs,
				nodeId: 5,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Node 005]"),
			});
		});

		it("prints a secondary tag including the CC endpoint", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: (msg) => !msg.includes("[Endpoint"),
			});

			controllerLogger.metadataUpdated({
				...baseArgs,
				endpoint: 5,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Endpoint 5]"),
				callNumber: 1,
			});
		});

		it("prints a secondary tag if the value is internal", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "interviewComplete",
			};

			controllerLogger.metadataUpdated({
				...baseArgs,
				internal: true,
			});
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[internal]"),
			});

			controllerLogger.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: (msg) => !msg.includes("[internal]"),
				callNumber: 1,
			});
		});

		it("prints the name of the property", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("foo"),
			});
		});

		it("prints the change type", () => {
			const baseArgs = {
				nodeId: 1,
				commandClass: CommandClasses.Basic,
				property: "foo",
			};

			controllerLogger.metadataUpdated(baseArgs);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.endsWith(": metadata updated"),
			});
		});
	});

	describe("interviewStage()", () => {
		it("includes a tag for the node ID", () => {
			controllerLogger.interviewStage({ id: 7 } as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Node 007]"),
			});
		});

		it("logs the name of the interview stage", () => {
			controllerLogger.interviewStage({
				id: 1,
				interviewStage: InterviewStage.CommandClasses,
			} as any);
			assertMessage(spyTransport, {
				predicate: (msg) =>
					msg.includes("Interview stage completed: CommandClasses"),
			});
		});

		it("prints a custom message when the interview is complete", () => {
			controllerLogger.interviewStage({
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
			controllerLogger.interviewStart({ id: 7 } as any);
			assertMessage(spyTransport, {
				predicate: (msg) => msg.includes("[Node 007]"),
			});
		});

		it("logs the name of the last interview stage", () => {
			controllerLogger.interviewStart({
				id: 5,
				interviewStage: InterviewStage.CommandClasses,
			} as any);
			assertMessage(spyTransport, {
				message:
					"  [Node 005] Beginning interview - last completed stage: CommandClasses",
			});
		});
	});

	describe("logNode()", () => {
		it("logs short messages correctly", () => {
			controllerLogger.logNode(3, "Test");
			assertMessage(spyTransport, {
				message: `  [Node 003] Test`,
			});

			controllerLogger.logNode(3, { message: "Test2" });
			assertMessage(spyTransport, {
				message: `  [Node 003] Test2`,
				callNumber: 1,
			});
		});

		it("logs long messages correctly", () => {
			controllerLogger.logNode(
				3,
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  [Node 003] This is a very long message that should be broken into multiple lin
  es maybe sometimes...`,
			});

			controllerLogger.logNode(5, {
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
			controllerLogger.logNode(1, "Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });

			controllerLogger.logNode(1, {
				message: "Test",
				level: "warn",
			});
			assertLogInfo(spyTransport, { level: "warn", callNumber: 1 });
		});

		it("has a default loglevel of info", () => {
			controllerLogger.logNode(3, "Test");
			assertLogInfo(spyTransport, { level: "info" });

			controllerLogger.logNode(3, { message: "Test" });
			assertLogInfo(spyTransport, { level: "info", callNumber: 1 });
		});

		it("logs the direction prefix", () => {
			controllerLogger.logNode(3, {
				message: "Test",
				direction: "inbound",
			});
			assertMessage(spyTransport, {
				message: "« [Node 003] Test",
			});
			controllerLogger.logNode(5, {
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
			controllerLogger.print("Test");
			assertMessage(spyTransport, {
				message: `  Test`,
			});
		});

		it("logs long messages correctly", () => {
			controllerLogger.print(
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
			);
			assertMessage(spyTransport, {
				message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
			});
		});

		it("logs with the given loglevel", () => {
			controllerLogger.print("Test", "warn");
			assertLogInfo(spyTransport, { level: "warn" });
		});

		it("has a default loglevel of info", () => {
			controllerLogger.print("Test");
			assertLogInfo(spyTransport, { level: "info" });
		});
	});
});
