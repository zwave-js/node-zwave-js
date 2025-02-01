import { MessagePriority, getDirectionPrefix } from "@zwave-js/core";
import {
	createDefaultTransportFormat,
	log as createZWaveLogContainer,
} from "@zwave-js/core/bindings/log/node";
import {
	SpyTransport,
	assertLogInfo,
	assertMessage,
} from "@zwave-js/core/test";
import { FunctionType, Message, MessageType } from "@zwave-js/serial";
import { createDeferredPromise } from "alcalzone-shared/deferred-promise";
import colors from "ansi-colors";
import MockDate from "mockdate";
import { beforeEach, test as baseTest } from "vitest";
import type { Driver } from "../driver/Driver.js";
import { createAndStartTestingDriver } from "../driver/DriverMock.js";
import { TransactionQueue } from "../driver/Queue.js";
import { Transaction } from "../driver/Transaction.js";
import { DriverLogger } from "./Driver.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		driverLogger: DriverLogger;
		spyTransport: SpyTransport;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const { driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				skipControllerIdentification: true,
			});

			// Replace all defined transports with a spy transport
			const spyTransport = new SpyTransport();
			spyTransport.format = createDefaultTransportFormat(true, true);
			const driverLogger = new DriverLogger(
				driver,
				createZWaveLogContainer({
					transports: [spyTransport],
				}),
			);
			// Uncomment this to debug the log outputs manually
			// wasSilenced = unsilence(driverLogger);

			MockDate.set(new Date().setHours(0, 0, 0, 0));

			// Run tests
			await use({ driver, driverLogger, spyTransport });

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();

			// Don't spam the console when performing the other tests not related to logging
			driverLogger.container.updateConfiguration({ enabled: false });
			MockDate.reset();
		},
		{ auto: true },
	],
});

beforeEach<LocalTestContext>(({ context, expect }) => {
	context.spyTransport.spy.resetHistory();
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
	return new Message({
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

test.sequential("print() logs short messages correctly", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print("Test");
	assertMessage(expect, spyTransport, {
		message: `  Test`,
	});
});

test.sequential("print() logs long messages correctly", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print(
		"This is a very long message that should be broken into multiple lines maybe sometimes...",
	);
	assertMessage(expect, spyTransport, {
		message:
			`  This is a very long message that should be broken into multiple lines maybe so
  metimes...`,
	});
});

test.sequential("print() logs with the given loglevel", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print("Test", "warn");
	assertLogInfo(expect, spyTransport, { level: "warn" });
});

test.sequential("print() has a default loglevel of verbose", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print("Test");
	assertLogInfo(expect, spyTransport, { level: "verbose" });
});

test.sequential(
	"print() prefixes the messages with the current timestamp and channel name",
	({ context, expect }) => {
		const { driverLogger, spyTransport } = context;
		driverLogger.print("Whatever");
		assertMessage(expect, spyTransport, {
			message: `00:00:00.000 DRIVER   Whatever`,
			ignoreTimestamp: false,
			ignoreChannel: false,
		});
	},
);

test.sequential("print() the timestamp is in a dim color", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print("Whatever");
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.startsWith(colors.gray("00:00:00.000")),
		ignoreTimestamp: false,
		ignoreChannel: false,
		ignoreColor: false,
	});
});

test.sequential("print() the channel name is in inverted gray color", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print("Whatever");
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.startsWith(colors.gray.inverse("DRIVER")),
		ignoreChannel: false,
		ignoreColor: false,
	});
});

test.sequential(
	"transaction() (for outbound messages) contains the direction",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		driverLogger.transaction(createTransaction(driver, {}));
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.startsWith(getDirectionPrefix("outbound")),
		});
	},
);
test.sequential(
	"transaction() (for outbound messages) contains the message type as a tag",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		driverLogger.transaction(
			createTransaction(driver, { type: MessageType.Request }),
		);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[REQ]"),
		});

		driverLogger.transaction(
			createTransaction(driver, { type: MessageType.Response }),
		);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[RES]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"transaction() (for outbound messages) contains the function type as a tag",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		driverLogger.transaction(
			createTransaction(driver, {
				functionType: FunctionType.GetSerialApiInitData,
			}),
		);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[GetSerialApiInitData]"),
		});
	},
);

test.sequential(
	"transaction() (for outbound messages) contains the message priority",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		driverLogger.transaction(
			createTransaction(driver, {
				priority: MessagePriority.Controller,
			}),
		);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[P: Controller]"),
		});
	},
);

test.sequential(
	"transactionResponse() (for inbound messages) contains the direction",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		const msg = createMessage(driver, {});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.startsWith(getDirectionPrefix("inbound")),
		});
	},
);

test.sequential(
	"transactionResponse() (for inbound messages) contains the message type as a tag",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		let msg = createMessage(driver, {
			type: MessageType.Request,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[REQ]"),
		});

		msg = createMessage(driver, {
			type: MessageType.Response,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[RES]"),
			callNumber: 1,
		});
	},
);

test.sequential(
	"transactionResponse() (for inbound messages) contains the function type as a tag",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		const msg = createMessage(driver, {
			functionType: FunctionType.HardReset,
		});
		driverLogger.transactionResponse(msg, undefined, null as any);
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[HardReset]"),
		});
	},
);

test.sequential(
	"transactionResponse() (for inbound messages) contains the role (regarding the transaction) of the received message as a tag",
	({ context, expect }) => {
		const { driver, driverLogger, spyTransport } = context;
		const msg = createMessage(driver, {
			functionType: FunctionType.HardReset,
		});
		driverLogger.transactionResponse(msg, undefined, "fatal_controller");
		assertMessage(expect, spyTransport, {
			predicate: (msg) => msg.includes("[fatal_controller]"),
		});
	},
);

test.sequential("sendQueue() prints the send queue length", ({ context, expect }) => {
	const { driver, driverLogger, spyTransport } = context;
	const queue = new TransactionQueue();
	driverLogger.sendQueue(queue);
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("(0 messages)"),
	});

	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	driverLogger.sendQueue(queue);
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("(1 message)"),
		callNumber: 1,
	});

	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	driverLogger.sendQueue(queue);
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("(2 messages)"),
		callNumber: 2,
	});
});

test.sequential("sendQueue() prints the function type for each message", ({ context, expect }) => {
	const { driver, driverLogger, spyTransport } = context;
	const queue = new TransactionQueue();
	queue.add(
		createTransaction(driver, {
			functionType: FunctionType.GetSUCNodeId,
		}),
	);
	queue.add(
		createTransaction(driver, { functionType: FunctionType.HardReset }),
	);
	driverLogger.sendQueue(queue);

	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("GetSUCNodeId"),
	});
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("HardReset"),
	});
});

test.sequential("sendQueue() prints the message type for each message", ({ context, expect }) => {
	const { driver, driverLogger, spyTransport } = context;
	const queue = new TransactionQueue();
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

	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("· [REQ] GetSUCNodeId"),
	});
	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes("· [RES] HardReset"),
	});
});

test.sequential("primary tags are printed in inverse colors", ({ context, expect }) => {
	const { driver, driverLogger, spyTransport } = context;
	const msg = createMessage(driver, {
		functionType: FunctionType.HardReset,
		type: MessageType.Response,
	});
	driverLogger.transactionResponse(msg, undefined, null as any);

	const expected1 = colors.cyan(
		colors.bgCyan("[")
			+ colors.inverse("RES")
			+ colors.bgCyan("]")
			+ " "
			+ colors.bgCyan("[")
			+ colors.inverse("HardReset")
			+ colors.bgCyan("]"),
	);

	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes(expected1),
		ignoreColor: false,
	});
});

test.sequential("inline tags are printed in inverse colors", ({ context, expect }) => {
	const { driverLogger, spyTransport } = context;
	driverLogger.print(`This is a message [with] [inline] tags...`);

	const expected1 = colors.bgCyan("[")
		+ colors.inverse("with")
		+ colors.bgCyan("]")
		+ " "
		+ colors.bgCyan("[")
		+ colors.inverse("inline")
		+ colors.bgCyan("]");

	assertMessage(expect, spyTransport, {
		predicate: (msg) => msg.includes(expected1),
		ignoreColor: false,
	});
});
