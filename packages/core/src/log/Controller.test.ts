import { assertLogInfo, assertMessage, SpyTransport } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
import { CommandClasses } from "../capabilities/CommandClasses";
import { InterviewStage } from "../consts/InterviewStage";
import { ControllerLogger } from "./Controller";
import { createDefaultTransportFormat, ZWaveLogContainer } from "./shared";

interface TestContext {
	controllerLogger: ControllerLogger;
	spyTransport: SpyTransport;
}

const test = ava as TestFn<TestContext>;

// Replace all defined transports with a spy transport
test.before((t) => {
	t.context.spyTransport = new SpyTransport();
	t.context.spyTransport.format = createDefaultTransportFormat(true, true);
	t.context.controllerLogger = new ControllerLogger(
		new ZWaveLogContainer({
			transports: [t.context.spyTransport],
		}),
	);
	// Uncomment this to debug the log outputs manually
	// wasSilenced = unsilence(controllerLogger);
});

// Don't spam the console when performing the other tests not related to logging
test.after.always((t) => {
	t.context.controllerLogger?.container.updateConfiguration({
		enabled: false,
	});
});

test.beforeEach((t) => {
	t.context.spyTransport.spy.mockClear();
});

test("ControllerLogger.value() -> prints a short tag for the change type", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints a tag including the CC name", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.value("added", { ...baseArgs, newValue: 1 });
	assertMessage(spyTransport, {
		predicate: (msg) => msg.includes("[Basic]"),
	});

	t.pass();
});

test("ControllerLogger.value() -> prints a tag including the Node ID", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints a secondary tag including the CC endpoint", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints a secondary tag if the value is internal", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints the name of the property", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints the name and key of map-like properties", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> prints a the value change according to the change type", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.value() -> stringifies objects", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.metadata() -> prints a tag including the CC name", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.metadataUpdated(baseArgs);
	assertMessage(spyTransport, {
		predicate: (msg) => msg.includes("[Basic]"),
	});

	t.pass();
});

test("ControllerLogger.metadata() -> prints a tag including the Node ID", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.metadata() -> prints a secondary tag including the CC endpoint", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.metadata() -> prints a secondary tag if the value is internal", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.metadata() -> it prints the name of the property", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.metadataUpdated(baseArgs);
	assertMessage(spyTransport, {
		predicate: (msg) => msg.includes("foo"),
	});

	t.pass();
});

test("ControllerLogger.metadata() -> prints the change type", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.metadataUpdated(baseArgs);
	assertMessage(spyTransport, {
		predicate: (msg) => msg.endsWith(": metadata updated"),
	});

	t.pass();
});

test("ControllerLogger.interviewStage() -> includes a tag for the node ID", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.interviewStage({ id: 7 } as any);
	assertMessage(spyTransport, {
		predicate: (msg) => msg.includes("[Node 007]"),
	});

	t.pass();
});

test("ControllerLogger.interviewStage() -> logs the name of the interview stage", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.interviewStage({
		id: 1,
		interviewStage: InterviewStage.CommandClasses,
	} as any);
	assertMessage(spyTransport, {
		predicate: (msg) =>
			msg.includes("Interview stage completed: CommandClasses"),
	});

	t.pass();
});

test("ControllerLogger.interviewStage() -> prints a custom message when the interview is complete", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.interviewStage({
		id: 5,
		interviewStage: InterviewStage.Complete,
	} as any);
	assertMessage(spyTransport, {
		message: "  [Node 005] Interview completed",
	});

	t.pass();
});

test("ControllerLogger.interviewStart() -> includes a tag for the node ID", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.interviewStart({ id: 7 } as any);
	assertMessage(spyTransport, {
		predicate: (msg) => msg.includes("[Node 007]"),
	});

	t.pass();
});

test("ControllerLogger.interviewStart() -> logs the name of the last interview stage", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.interviewStart({
		id: 5,
		interviewStage: InterviewStage.CommandClasses,
	} as any);
	assertMessage(spyTransport, {
		message:
			"  [Node 005] Beginning interview - last completed stage: CommandClasses",
	});

	t.pass();
});

test("ControllerLogger.logNode() -> logs short messages correctly", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.logNode(3, "Test");
	assertMessage(spyTransport, {
		message: `  [Node 003] Test`,
	});

	controllerLogger.logNode(3, { message: "Test2" });
	assertMessage(spyTransport, {
		message: `  [Node 003] Test2`,
		callNumber: 1,
	});

	t.pass();
});

test("ControllerLogger.logNode() -> logs long messages correctly", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.logNode() -> logs with the given loglevel", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.logNode(1, "Test", "warn");
	assertLogInfo(spyTransport, { level: "warn" });

	controllerLogger.logNode(1, {
		message: "Test",
		level: "warn",
	});
	assertLogInfo(spyTransport, { level: "warn", callNumber: 1 });
});

test("ControllerLogger.logNode() -> has a default loglevel of info", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.logNode(3, "Test");
	assertLogInfo(spyTransport, { level: "info" });

	controllerLogger.logNode(3, { message: "Test" });
	assertLogInfo(spyTransport, { level: "info", callNumber: 1 });
});

test("ControllerLogger.logNode() -> logs the direction prefix", (t) => {
	const { controllerLogger, spyTransport } = t.context;

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

	t.pass();
});

test("ControllerLogger.print() -> logs short messages correctly", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.print("Test");
	assertMessage(spyTransport, {
		message: `  Test`,
	});

	t.pass();
});

test("ControllerLogger.print() -> logs long messages correctly", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.print(
		"This is a very long message that should be broken into multiple lines maybe sometimes...",
	);
	assertMessage(spyTransport, {
		message: `  This is a very long message that should be broken into multiple lines maybe so
metimes...`,
	});

	t.pass();
});

test("ControllerLogger.print() -> logs with the given loglevel", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.print("Test", "warn");
	assertLogInfo(spyTransport, { level: "warn" });
});

test("ControllerLogger.print() -> has a default loglevel of info", (t) => {
	const { controllerLogger, spyTransport } = t.context;

	controllerLogger.print("Test");
	assertLogInfo(spyTransport, { level: "info" });
});
