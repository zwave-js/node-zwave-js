import * as winston from "winston";
import { colorizer } from "./Colorizer";
import {
	getDirectionPrefix,
	logMessageFormatter,
	logMessagePrinter,
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
const logger = winston.loggers.get("driver");

/**
 * Logs a message
 * @param msg The message to output
 */
export function message(message: string): void {
	logger.log({
		level: DRIVER_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}
