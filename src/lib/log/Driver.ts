import * as winston from "winston";
import { Transaction } from "../driver/Transaction";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import { colorizer } from "./Colorizer";
import {
	DataDirection,
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
export function print(message: string): void {
	logger.log({
		level: DRIVER_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}

/** Serializes a message that is transmitted or received for logging */
export function transaction(
	direction: DataDirection,
	transaction: Transaction,
): void {
	const tags: string[] = [];
	const { message } = transaction;
	tags.push(message.type === MessageType.Request ? "REQ" : "RES");
	tags.push(FunctionType[message.functionType]);

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
		primaryTags: tagify(tags),
		secondaryTags: tagify(secondaryTags),
		message: "",
		direction: getDirectionPrefix(direction),
	});
}
