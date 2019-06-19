import { SortedList } from "alcalzone-shared/sorted-list";
import * as winston from "winston";
import { isCommandClassContainer } from "../commandclass/ICommandClassContainer";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { Message, ResponseRole } from "../message/Message";
import { colorizer } from "./Colorizer";
import {
	getDirectionPrefix,
	logMessageFormatter,
	logMessagePrinter,
	tagify,
	ZWaveLogger,
} from "./shared";
const { combine, timestamp, label } = winston.format;

const DRIVER_LABEL = "DRIVER";
const DRIVER_LOGLEVEL = "verbose";

export const driverLoggerFormat = combine(
	label({ label: DRIVER_LABEL }),
	timestamp(),
	logMessageFormatter,
	colorizer(),
	logMessagePrinter,
);

if (!winston.loggers.has("driver")) {
	winston.loggers.add("driver", {
		format: driverLoggerFormat,
		// transports: [new winston.transports.Console({ level: "silly" })],
	});
}
const logger: ZWaveLogger = winston.loggers.get("driver");

/**
 * Logs a message
 * @param msg The message to output
 */
export function print(message: string, level?: "warn" | "error"): void {
	logger.log({
		level: level || DRIVER_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}

/**
 * Serializes a message that starts a transaction, i.e. a message that is sent and may expect a response
 */
export function transaction(transaction: Transaction): void {
	const { message } = transaction;
	const primaryTags: string[] = getPrimaryTagsForMessage(message);

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

	logger.log({
		level: DRIVER_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message: "",
		// Since we are programming a controller, the first message of a transaction is always outbound
		// (not to confuse with the message type, which may be Request or Response)
		direction: getDirectionPrefix("outbound"),
	});
}

/** Logs information about a message that is received as a response to a transaction */
export function transactionResponse(
	message: Message,
	role: ResponseRole,
): void {
	const primaryTags: string[] = getPrimaryTagsForMessage(message);
	const secondaryTags = [role];

	logger.log({
		level: DRIVER_LOGLEVEL,
		primaryTags: tagify(primaryTags),
		secondaryTags: tagify(secondaryTags),
		message: "",
		// Since we are programming a controller, responses are always inbound
		// (not to confuse with the message type, which may be Request or Response)
		direction: getDirectionPrefix("inbound"),
	});
}

function getPrimaryTagsForMessage(message: Message) {
	return [
		message.type === MessageType.Request ? "REQ" : "RES",
		FunctionType[message.functionType],
	];
}

export function sendQueue(queue: SortedList<Transaction>): void {
	let message: string = "Send queue:";
	for (const trns of queue) {
		// TODO: This formatting should be shared with the other logging methods
		const node = trns.message.getNodeUnsafe();
		const postfix =
			node != undefined
				? ` [Node ${node.id}, ${node.isAwake() ? "awake" : "asleep"}]`
				: "";
		const command = isCommandClassContainer(trns.message)
			? ` (${trns.message.command.constructor.name})`
			: "";
		// TODO: this is driver level
		message += `\n  ${
			FunctionType[trns.message.functionType]
		}${command}${postfix}`;
	}
	logger.log({
		level: DRIVER_LOGLEVEL,
		message,
		secondaryTags: `(${queue.length} message${
			queue.length === 1 ? "" : "s"
		})`,
		direction: getDirectionPrefix("none"),
	});
}
