import * as winston from "winston";
import {
	createConsoleTransport,
	createLoggerFormat,
	getDirectionPrefix,
	tagify,
	ZWaveLogger,
} from "./shared";

const REFLECTION_LABEL = "RFLCTN";
const REFLECTION_LOGLEVEL = "silly";

export const reflectionLoggerFormat = createLoggerFormat(REFLECTION_LABEL);

if (!winston.loggers.has("reflection")) {
	winston.loggers.add("reflection", {
		format: reflectionLoggerFormat,
		transports: [createConsoleTransport()],
	});
}
const logger: ZWaveLogger = winston.loggers.get("reflection");

/**
 * Logs the process of defining metadata for a class
 * @param name The class to log the definition for
 * @param type What kind of metadata is defined
 * @param message An additional message
 */
export function define(name: string, type: string, message: string): void {
	logger.log({
		level: REFLECTION_LOGLEVEL,
		primaryTags: tagify([name]),
		message: `defining ${type} => ${message}`,
		direction: getDirectionPrefix("none"),
	});
}

/**
 * Logs the process of looking up metadata for a class
 * @param name The class to log the definition for
 * @param type What kind of metadata is retrieved
 * @param message An additional message, e.g. the resulting value
 */
export function lookup(name: string, type: string, message: string): void {
	logger.log({
		level: REFLECTION_LOGLEVEL,
		primaryTags: tagify([name]),
		message: `retrieving ${type} => ${message}`,
		direction: getDirectionPrefix("none"),
	});
}

/**
 * Logs a message
 * @param msg The message to output
 */
export function print(message: string, level?: "warn" | "error"): void {
	logger.log({
		level: level || REFLECTION_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}
