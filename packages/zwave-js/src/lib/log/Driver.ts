import {
	createLoggerFormat,
	createLogTransports,
	DataDirection,
	getDirectionPrefix,
	isLoglevelVisible,
	messageToLines,
	shouldLogNode,
	tagify,
	ZWaveLogger,
} from "@zwave-js/core";
import type { SortedList } from "alcalzone-shared/sorted-list";
import winston from "winston";
import type { CommandClass } from "../commandclass/CommandClass";
import { isEncapsulatingCommandClass } from "../commandclass/EncapsulatingCommandClass";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import type { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import type { Message, ResponseRole } from "../message/Message";

export const DRIVER_LABEL = "DRIVER";
const DRIVER_LOGLEVEL = "verbose";
const SENDQUEUE_LOGLEVEL = "debug";

let _logger: ZWaveLogger | undefined;
function getLogger(): ZWaveLogger {
	if (!_logger) {
		if (!winston.loggers.has("driver")) {
			winston.loggers.add("driver", {
				transports: createLogTransports(),
				format: createLoggerFormat(DRIVER_LABEL),
			});
		}
		_logger = (winston.loggers.get("driver") as unknown) as ZWaveLogger;
	}
	return _logger;
}
let _isDriverLogVisible: boolean | undefined;
function isDriverLogVisible(): boolean {
	if (_isDriverLogVisible === undefined) {
		_isDriverLogVisible = isLoglevelVisible(DRIVER_LOGLEVEL);
	}
	return _isDriverLogVisible;
}
let _isSendQueueLogVisible: boolean | undefined;
function isSendQueueLogVisible(): boolean {
	if (_isSendQueueLogVisible === undefined) {
		_isSendQueueLogVisible = isLoglevelVisible(SENDQUEUE_LOGLEVEL);
	}
	return _isSendQueueLogVisible;
}

/**
 * Logs a message
 * @param msg The message to output
 */
export function print(
	message: string,
	level?: "debug" | "verbose" | "warn" | "error" | "info",
): void {
	const actualLevel = level || DRIVER_LOGLEVEL;
	if (!isLoglevelVisible(actualLevel)) return;

	getLogger().log({
		level: actualLevel,
		message,
		direction: getDirectionPrefix("none"),
	});
}

/**
 * Serializes a message that starts a transaction, i.e. a message that is sent and may expect a response
 */
export function transaction(transaction: Transaction): void {
	if (!isDriverLogVisible()) return;

	const { message } = transaction;
	// On the first attempt, we print the basic information about the transaction
	const secondaryTags: string[] = [];
	if (transaction.sendAttempts === 1) {
		secondaryTags.push(`P: ${MessagePriority[transaction.priority]}`);
	} else {
		// On later attempts, we print the send attempts
		secondaryTags.push(
			`attempt ${transaction.sendAttempts}/${transaction.maxSendAttempts}`,
		);
	}

	logMessage(message, {
		secondaryTags,
		// Since we are programming a controller, the first message of a transaction is always outbound
		// (not to confuse with the message type, which may be Request or Response)
		direction: "outbound",
	});
}

/** Logs information about a message that is received as a response to a transaction */
export function transactionResponse(
	message: Message,
	originalTransaction: Transaction | undefined,
	role: ResponseRole,
): void {
	if (!isDriverLogVisible()) return;
	logMessage(message, {
		nodeId: originalTransaction?.message?.getNodeId(),
		secondaryTags: [role],
		direction: "inbound",
	});
}

export function logMessage(
	message: Message,
	{
		// Used to relate this log message to a node
		nodeId,
		secondaryTags,
		direction = "none",
	}: {
		nodeId?: number;
		secondaryTags?: string[];
		direction?: DataDirection;
	} = {},
): void {
	if (!isDriverLogVisible()) return;
	if (nodeId == undefined) nodeId = message.getNodeId();
	if (nodeId != undefined && !shouldLogNode(nodeId)) return;

	const isCCContainer = isCommandClassContainer(message);
	const logEntry = message.toLogEntry();

	let msg: string[] = [tagify(logEntry.tags)];
	if (logEntry.message) {
		msg.push(
			...messageToLines(logEntry.message).map(
				(line) => (isCCContainer ? "│ " : "  ") + line,
			),
		);
	}

	// If possible, include information about the CCs
	if (isCommandClassContainer(message)) {
		// Remove the default payload message and draw a bracket
		msg = msg.filter((line) => !line.startsWith("│ payload:"));

		let indent = 0;
		let cc: CommandClass = message.command;
		while (true) {
			const isEncapCC = isEncapsulatingCommandClass(cc);
			const loggedCC = cc.toLogEntry();
			msg.push(" ".repeat(indent * 2) + "└─" + tagify(loggedCC.tags));

			indent++;
			if (loggedCC.message) {
				msg.push(
					...messageToLines(loggedCC.message).map(
						(line) =>
							`${" ".repeat(indent * 2)}${
								isEncapCC ? "│ " : "  "
							}${line}`,
					),
				);
			}
			// If this is an encap CC, continue
			if (isEncapsulatingCommandClass(cc)) {
				cc = cc.encapsulated;
			} else {
				break;
			}
		}
	}

	getLogger().log({
		level: DRIVER_LOGLEVEL,
		secondaryTags:
			secondaryTags && secondaryTags.length > 0
				? tagify(secondaryTags)
				: undefined,
		message: msg,
		// Since we are programming a controller, responses are always inbound
		// (not to confuse with the message type, which may be Request or Response)
		direction: getDirectionPrefix(direction),
	});
}

/** Logs whats currently in the driver's send queue */
export function sendQueue(queue: SortedList<Transaction>): void {
	if (!isSendQueueLogVisible()) return;

	let message = "Send queue:";
	if (queue.length > 0) {
		for (const trns of queue) {
			// TODO: This formatting should be shared with the other logging methods
			const node = trns.message.getNodeUnsafe();
			const prefix =
				trns.message.type === MessageType.Request ? "[REQ]" : "[RES]";
			const postfix =
				node != undefined
					? ` [Node ${node.id}, ${
							node.isAwake() ? "awake" : "asleep"
					  }]`
					: "";
			const command = isCommandClassContainer(trns.message)
				? ` (${trns.message.command.constructor.name})`
				: "";
			message += `\n· ${prefix} ${
				FunctionType[trns.message.functionType]
			}${command}${postfix}`;
		}
	} else {
		message += " (empty)";
	}
	getLogger().log({
		level: SENDQUEUE_LOGLEVEL,
		message,
		secondaryTags: `(${queue.length} message${
			queue.length === 1 ? "" : "s"
		})`,
		direction: getDirectionPrefix("none"),
	});
}
