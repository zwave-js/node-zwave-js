import {
	createDefaultTransportFormat,
	getDirectionPrefix,
	MessagePriority,
	ZWaveLogContainer,
} from "@zwave-js/core";
import {
	assertLogInfoAva,
	assertMessageAva,
	SpyTransport,
} from "@zwave-js/core/test";
import { FunctionType, Message, MessageType } from "@zwave-js/serial";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import { SortedList } from "alcalzone-shared/sorted-list";
import colors from "ansi-colors";
import ava, { type TestFn } from "ava";
import MockDate from "mockdate";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { Transaction } from "../driver/Transaction";
import { DriverLogger } from "./Driver";

interface TestContext {
	driver: Driver;
	driverLogger: DriverLogger;
	spyTransport: SpyTransport;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(30000);

	const { driver } = await createAndStartTestingDriver({
		loadConfiguration: false,
		skipNodeInterview: true,
		skipControllerIdentification: true,
		// beforeStartup(mockPort) {
		// 	controller = new MockController({ serial: mockPort });
		// 	controller.defineBehavior(
		// 		...createDefaultMockControllerBehaviors(),
		// 	);
		// },
	});
	t.context.driver = driver;

	// Replace all defined transports with a spy transport
	const spyTransport = new SpyTransport();
	spyTransport.format = createDefaultTransportFormat(true, true);
	const driverLogger = new DriverLogger(
		driver,
		new ZWaveLogContainer({
			transports: [spyTransport],
		}),
	);
	// Uncomment this to debug the log outputs manually
	// wasSilenced = unsilence(driverLogger);

	t.context.driverLogger = driverLogger;
	t.context.spyTransport = spyTransport;

	MockDate.set(new Date().setHours(0, 0, 0, 0));
});

test.after.always(async (t) => {
	const { driver, driverLogger } = t.context;
	await driver.destroy();

	// Don't spam the console when performing the other tests not related to logging
	driverLogger.container.updateConfiguration({ enabled: false });
	MockDate.reset();
});

test.beforeEach((t) => {
	t.context.spyTransport.spy.resetHistory();
});

interface CreateMessageOptions {
	type: MessageType;
	functionType: FunctionType;
}

interface CreateTransactionOptions extends CreateMessageOptions {
	priority: MessagePriority;
}

function createMessage(
	driver: Driver,
	options: Partial<CreateTransactionOptions>,
) {
	return new Message(driver, {
		type: options.type || MessageType.Request,
		functionType: options.functionType || (0x00 as any),
	});
}

function createTransaction(
	driver: Driver,
	options: Partial<CreateTransactionOptions>,
): Transaction {
	const message = createMessage(driver, options);
	const trns = new Transaction(driver, {
		message,
		parts: {} as any,
		promise: createDeferredPromise(),
		priority: options.priority || MessagePriority.Controller,
	});
	return trns;
}

test.serial("print() logs short messages correctly", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print("Test");
	assertMessageAva(t, spyTransport, {
		message: `  Test`,
	});
});

test.serial("print() logs long messages correctly", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print(
		"This is a very long message that should be broken into multiple lines maybe sometimes...",
	);
	assertMessageAva(t, spyTransport, {
		message: `  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
	});
});

test.serial("print() logs with the given loglevel", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print("Test", "warn");
	assertLogInfoAva(t, spyTransport, { level: "warn" });
});

test.serial("print() has a default loglevel of verbose", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print("Test");
	assertLogInfoAva(t, spyTransport, { level: "verbose" });
});

test.serial(
	"print() prefixes the messages with the current timestamp and channel name",
	(t) => {
		const { driverLogger, spyTransport } = t.context;
		driverLogger.print("Whatever");
		assertMessageAva(t, spyTransport, {
			message: `00:00:00.000 DRIVER   Whatever`,
			ignoreTimestamp: false,
			ignoreChannel: false,
		});
	},
);

test.serial("print() the timestamp is in a dim color", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print("Whatever");
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.startsWith(colors.gray("00:00:00.000")),
		ignoreTimestamp: false,
		ignoreChannel: false,
		ignoreColor: false,
	});
});

test.serial("print() the channel name is in inverted gray color", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print("Whatever");
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.startsWith(colors.gray.inverse("DRIVER")),
		ignoreChannel: false,
		ignoreColor: false,
	});
});

test.serial(
	"transaction() (for outbound messages) contains the direction",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		driverLogger.transaction(createTransaction(driver, {}));
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.startsWith(getDirectionPrefix("outbound")),
		});
	},
);
test.serial(
	"transaction() (for outbound messages) contains the message type as a tag",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		driverLogger.transaction(
			createTransaction(driver, { type: MessageType.Request }),
		);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[REQ]"),
		});

		driverLogger.transaction(
			createTransaction(driver, { type: MessageType.Response }),
		);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[RES]"),
			callNumber: 1,
		});
	},
);

test.serial(
	"transaction() (for outbound messages) contains the function type as a tag",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		driverLogger.transaction(
			createTransaction(driver, {
				functionType: FunctionType.GetSerialApiInitData,
			}),
		);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[GetSerialApiInitData]"),
		});
	},
);

test.serial(
	"transaction() (for outbound messages) contains the message priority",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		driverLogger.transaction(
			createTransaction(driver, {
				priority: MessagePriority.MultistepController,
			}),
		);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[P: MultistepController]"),
		});
	},
);

test.serial(
	"transactionResponse() (for inbound messages) contains the direction",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		const msg = createMessage(driver, {});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.startsWith(getDirectionPrefix("inbound")),
		});
	},
);

test.serial(
	"transactionResponse() (for inbound messages) contains the message type as a tag",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		let msg = createMessage(driver, {
			type: MessageType.Request,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[REQ]"),
		});

		msg = createMessage(driver, {
			type: MessageType.Response,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[RES]"),
			callNumber: 1,
		});
	},
);

test.serial(
	"transactionResponse() (for inbound messages) contains the function type as a tag",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		const msg = createMessage(driver, {
			functionType: FunctionType.HardReset,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[HardReset]"),
		});
	},
);

test.serial(
	"transactionResponse() (for inbound messages) contains the role (regarding the transaction) of the received message as a tag",
	(t) => {
		const { driver, driverLogger, spyTransport } = t.context;
		const msg = createMessage(driver, {
			functionType: FunctionType.HardReset,
		});
		driverLogger.transactionResponse(msg, undefined, "fatal_controller");
		assertMessageAva(t, spyTransport, {
			predicate: (msg) => msg.includes("[fatal_controller]"),
		});
	},
);

test.serial("sendQueue() prints the send queue length", (t) => {
	const { driver, driverLogger, spyTransport } = t.context;
	const queue = new SortedList<Transaction>();
	driverLogger.sendQueue(queue);
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("(0 messages)"),
	});

	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	driverLogger.sendQueue(queue);
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("(1 message)"),
		callNumber: 1,
	});

	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	driverLogger.sendQueue(queue);
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("(2 messages)"),
		callNumber: 2,
	});
});

test.serial("sendQueue() prints the function type for each message", (t) => {
	const { driver, driverLogger, spyTransport } = t.context;
	const queue = new SortedList<Transaction>();
	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	queue.add(
		createTransaction(driver, { functionType: FunctionType.HardReset }),
	);
	driverLogger.sendQueue(queue);

	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("GetSUCNodeId"),
	});
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("HardReset"),
	});
});

test.serial("sendQueue() prints the message type for each message", (t) => {
	const { driver, driverLogger, spyTransport } = t.context;
	const queue = new SortedList<Transaction>();
	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
			type: MessageType.Request,
		}),
	);
	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.HardReset,
			type: MessageType.Response,
		}),
	);
	driverLogger.sendQueue(queue);

	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("· [REQ] GetSUCNodeId"),
	});
	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes("· [RES] HardReset"),
	});
});

test.serial("primary tags are printed in inverse colors", (t) => {
	const { driver, driverLogger, spyTransport } = t.context;
	const msg = createMessage(driver, {
		functionType: FunctionType.HardReset,
		type: MessageType.Response,
	});
	driverLogger.transactionResponse(msg, undefined, null as any);

	const expected1 = colors.cyan(
		colors.bgCyan("[") +
			colors.inverse("RES") +
			colors.bgCyan("]") +
			" " +
			colors.bgCyan("[") +
			colors.inverse("HardReset") +
			colors.bgCyan("]"),
	);

	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes(expected1),
		ignoreColor: false,
	});
});

test.serial("inline tags are printed in inverse colors", (t) => {
	const { driverLogger, spyTransport } = t.context;
	driverLogger.print(`This is a message [with] [inline] tags...`);

	const expected1 =
		colors.bgCyan("[") +
		colors.inverse("with") +
		colors.bgCyan("]") +
		" " +
		colors.bgCyan("[") +
		colors.inverse("inline") +
		colors.bgCyan("]");

	assertMessageAva(t, spyTransport, {
		predicate: (msg) => msg.includes(expected1),
		ignoreColor: false,
	});
});
