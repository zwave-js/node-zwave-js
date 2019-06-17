import * as winston from "winston";
import { FunctionType, MessageType } from "../message/Constants";
import { Message } from "../message/Message";
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
		transports: [new winston.transports.Console({ level: "silly" })],
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
export function message(direction: DataDirection, message: Message): void {
	const tags: string[] = [];
	tags.push(message.type === MessageType.Request ? "REQ" : "RES");
	tags.push(FunctionType[message.functionType]);

	logger.log({
		level: DRIVER_LOGLEVEL,
		primaryTags: tagify(tags),
		message: "",
		direction: getDirectionPrefix(direction),
	});
}
