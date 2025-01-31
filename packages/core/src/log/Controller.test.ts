import { log as createZWaveLogContainer } from "@zwave-js/core/bindings/log/node";
import { createDefaultTransportFormat } from "@zwave-js/core/bindings/log/node";
import { beforeEach, test as baseTest } from "vitest";
import { CommandClasses } from "../definitions/CommandClasses.js";
import { InterviewStage } from "../definitions/InterviewStage.js";
import {
	SpyTransport,
	assertLogInfo,
	assertMessage,
} from "../test/SpyTransport.js";
import { ControllerLogger } from "./Controller.js";

// Extend the test conte

interface LocalTestContext {
	context: {
		controllerLogger: ControllerLogger;
		spyTransport: SpyTransport;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Replace all defined transports with a spy transport
			const spyTransport = new SpyTransport();
			spyTransport.format = createDefaultTransportFormat(true, true);
			const controllerLogger = new ControllerLogger(
				createZWaveLogContainer({
					transports: [spyTransport],
				}),
			);

			// Uncomment this to debug the log outputs manually
			// unsilence(controllerLogger);

			await use({ controllerLogger, spyTransport });

			// Don't spam the console when performing the other tests not related to logging
			controllerLogger.container.updateConfiguration({
				enabled: false,
			});
		},
		{ auto: true },
	],
});

beforeEach<LocalTestContext>(({ context }) => {
	context.spyTransport.spy.resetHistory();
});

test.sequential(
	"ControllerLogger.value() -> prints a short tag for the change type",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.value("added", { ...baseArgs, newValue: 1 });
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[+]"),
		});

		controllerLogger.value("updated", {
			...baseArgs,
			prevValue: 7,
			newValue: 1,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[~]"),
			callNumber: 1,
		});

		controllerLogger.value("removed", { ...baseArgs, prevValue: 7 });
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[-]"),
			callNumber: 2,
		});
	},
);

test.sequential(
	"ControllerLogger.value() -> prints a tag including the CC name",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.value("added", { ...baseArgs, newValue: 1 });
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Basic]"),
		});
	},
);

test.sequential(
	"ControllerLogger.value() -> prints a tag including the Node ID",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

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
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Node 005]"),
		});
	},
);

test.sequential(
	"ControllerLogger.value() -> prints a secondary tag including the CC endpoint",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.value("added", { ...baseArgs, newValue: 1 });
		assertMessage(expect, spyTransport, {
			predicate: (msg) => !msg.includes("[Endpoint"),
		});

		controllerLogger.value("added", {
			...baseArgs,
			newValue: 1,
			endpoint: 5,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Endpoint 5]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.value() -> prints a secondary tag if the value is internal",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

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
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[internal]"),
		});

		controllerLogger.value("added", {
			...baseArgs,
			newValue: true,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => !msg.includes("[internal]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.value() -> prints the name of the property",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

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
			assertMessage(expect, spyTransport, {
				predicate: (msg) => msg.includes("foo"),
				callNumber,
			});
		}
	},
);

test.sequential(
	"ControllerLogger.value() -> prints the name and key of map-like properties",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

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
			assertMessage(expect, spyTransport, {
				predicate: (msg) => msg.includes("bar[baz]"),
				callNumber,
			});
		}
	},
);

test.sequential(
	"ControllerLogger.value() -> prints a the value change according to the change type",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.value("added", { ...baseArgs, newValue: 1 });
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes(": 1"),
		});

		controllerLogger.value("updated", {
			...baseArgs,
			prevValue: false,
			newValue: "asdf",
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes(`: false => "asdf"`),
			callNumber: 1,
		});

		controllerLogger.value("removed", {
			...baseArgs,
			prevValue: 5,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("(was 5)"),
			callNumber: 2,
		});
	},
);

test.sequential("ControllerLogger.value() -> stringifies objects", ({ context, expect }) => {
	const { controllerLogger, spyTransport } = context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.value("added", {
		...baseArgs,
		newValue: { foo: "bar" },
	});
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes(`{"foo":"bar"}`),
	});
});

test.sequential(
	"ControllerLogger.metadata() -> prints a tag including the CC name",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.metadataUpdated(baseArgs);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Basic]"),
		});
	},
);

test.sequential(
	"ControllerLogger.metadata() -> prints a tag including the Node ID",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.metadataUpdated({
			...baseArgs,
			nodeId: 5,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Node 005]"),
		});
	},
);

test.sequential(
	"ControllerLogger.metadata() -> prints a secondary tag including the CC endpoint",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.metadataUpdated(baseArgs);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => !msg.includes("[Endpoint"),
		});

		controllerLogger.metadataUpdated({
			...baseArgs,
			endpoint: 5,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Endpoint 5]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.metadata() -> prints a secondary tag if the value is internal",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "interviewComplete",
		};

		controllerLogger.metadataUpdated({
			...baseArgs,
			internal: true,
		});
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[internal]"),
		});

		controllerLogger.metadataUpdated(baseArgs);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => !msg.includes("[internal]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.metadata() -> it prints the name of the property",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		const baseArgs = {
			nodeId: 1,
			commandClass: CommandClasses.Basic,
			property: "foo",
		};

		controllerLogger.metadataUpdated(baseArgs);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("foo"),
		});
	},
);

test.sequential("ControllerLogger.metadata() -> prints the change type", ({ context, expect }) => {
	const { controllerLogger, spyTransport } = context;

	const baseArgs = {
		nodeId: 1,
		commandClass: CommandClasses.Basic,
		property: "foo",
	};

	controllerLogger.metadataUpdated(baseArgs);
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.endsWith(": metadata updated"),
	});
});

test.sequential(
	"ControllerLogger.interviewStage() -> includes a tag for the node ID",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.interviewStage({ id: 7 } as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Node 007]"),
		});
	},
);

test.sequential(
	"ControllerLogger.interviewStage() -> logs the name of the interview stage",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.interviewStage({
			id: 1,
			interviewStage: InterviewStage.CommandClasses,
		} as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) =>
				msg.includes("Interview stage completed: CommandClasses"),
		});
	},
);

test.sequential(
	"ControllerLogger.interviewStage() -> prints a custom message when the interview is complete",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.interviewStage({
			id: 5,
			interviewStage: InterviewStage.Complete,
		} as any);
		assertMessage(expect, spyTransport, {
			message: "  [Node 005] Interview completed",
		});
	},
);

test.sequential(
	"ControllerLogger.interviewStart() -> includes a tag for the node ID",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.interviewStart({ id: 7 } as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[Node 007]"),
		});
	},
);

test.sequential(
	"ControllerLogger.interviewStart() -> logs the name of the last interview stage",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.interviewStart({
			id: 5,
			interviewStage: InterviewStage.CommandClasses,
		} as any);
		assertMessage(expect, spyTransport, {
			message:
				"  [Node 005] Beginning interview - last completed stage: CommandClasses",
		});
	},
);

test.sequential(
	"ControllerLogger.logNode() -> logs short messages correctly",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.logNode(3, "Test");
		assertMessage(expect, spyTransport, {
			message: `  [Node 003] Test`,
		});

		controllerLogger.logNode(3, { message: "Test2" });
		assertMessage(expect, spyTransport, {
			message: `  [Node 003] Test2`,
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.logNode() -> logs long messages correctly",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.logNode(
			3,
			"This is a very long message that should be broken into multiple lines maybe sometimes...",
		);
		assertMessage(expect, spyTransport, {
			message:
				`  [Node 003] This is a very long message that should be broken into multiple lin
  es maybe sometimes...`,
		});

		controllerLogger.logNode(5, {
			message:
				"This is a very long message that should be broken into multiple lines maybe sometimes...",
		});
		assertMessage(expect, spyTransport, {
			message:
				`  [Node 005] This is a very long message that should be broken into multiple lin
  es maybe sometimes...`,
			callNumber: 1,
		});
	},
);

test.sequential(
	"ControllerLogger.logNode() -> logs with the given loglevel",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.logNode(1, "Test", "warn");
		assertLogInfo(expect, spyTransport, { level: "warn" });

		controllerLogger.logNode(1, {
			message: "Test",
			level: "warn",
		});
		assertLogInfo(expect, spyTransport, { level: "warn", callNumber: 1 });
	},
);

test.sequential(
	"ControllerLogger.logNode() -> has a default loglevel of info",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.logNode(3, "Test");
		assertLogInfo(expect, spyTransport, { level: "info" });

		controllerLogger.logNode(3, { message: "Test" });
		assertLogInfo(expect, spyTransport, { level: "info", callNumber: 1 });
	},
);

test.sequential("ControllerLogger.logNode() -> logs the direction prefix", ({ context, expect }) => {
	const { controllerLogger, spyTransport } = context;

	controllerLogger.logNode(3, {
		message: "Test",
		direction: "inbound",
	});
	assertMessage(expect, spyTransport, {
		message: "« [Node 003] Test",
	});
	controllerLogger.logNode(5, {
		message: "Test",
		direction: "outbound",
	});
	assertMessage(expect, spyTransport, {
		message: "» [Node 005] Test",
		callNumber: 1,
	});
});

test.sequential(
	"ControllerLogger.print() -> logs short messages correctly",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.print("Test");
		assertMessage(expect, spyTransport, {
			message: `  Test`,
		});
	},
);

test.sequential("ControllerLogger.print() -> logs long messages correctly", ({ context, expect }) => {
	const { controllerLogger, spyTransport } = context;

	controllerLogger.print(
		"This is a very long message that should be broken into multiple lines maybe sometimes...",
	);
	assertMessage(expect, spyTransport, {
		message:
			`  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
	});
});

test.sequential("ControllerLogger.print() -> logs with the given loglevel", ({ context, expect }) => {
	const { controllerLogger, spyTransport } = context;

	controllerLogger.print("Test", "warn");
	assertLogInfo(expect, spyTransport, { level: "warn" });
});

test.sequential(
	"ControllerLogger.print() -> has a default loglevel of info",
	({ context, expect }) => {
		const { controllerLogger, spyTransport } = context;

		controllerLogger.print("Test");
		assertLogInfo(expect, spyTransport, { level: "info" });
	},
);
