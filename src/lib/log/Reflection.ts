import winston from "winston";
import {
	createLogTransports,
	getDirectionPrefix,
	isLoglevelVisible,
	tagify,
	ZWaveLogger,
} from "./shared";

export const REFLECTION_LABEL = "RFLCTN";
const REFLECTION_LOGLEVEL = "silly";

if (!winston.loggers.has("reflection")) {
	winston.loggers.add("reflection", {
		transports: createLogTransports(REFLECTION_LABEL),
	});
}
const logger = (winston.loggers.get("reflection") as unknown) as ZWaveLogger;
const isVisible = isLoglevelVisible(REFLECTION_LOGLEVEL);

/**
 * Logs the process of defining metadata for a class
 * @param name The class to log the definition for
 * @param type What kind of metadata is defined
 * @param message An additional message
 */
export function define(name: string, type: string, message: string): void {
	if (!isVisible) return;

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
	if (!isVisible) return;

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
	const actualLevel = level || REFLECTION_LOGLEVEL;
	if (!isLoglevelVisible(actualLevel)) return;

	logger.log({
		level: actualLevel,
		message,
		direction: getDirectionPrefix("none"),
	});
}
