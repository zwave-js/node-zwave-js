import * as winston from "winston";
import { colorizer } from "./Colorizer";
import {
	getDirectionPrefix,
	logMessageFormatter,
	logMessagePrinter,
	tagify,
	ZWaveLogger,
} from "./shared";
const { combine, timestamp, label } = winston.format;

const REFLECTION_LABEL = "REFLECTION";
const REFLECTION_LOGLEVEL = "silly";

export const reflectionLoggerFormat = combine(
	label({ label: REFLECTION_LABEL }),
	timestamp(),
	logMessageFormatter,
	colorizer(),
	logMessagePrinter,
);

if (!winston.loggers.has("reflection")) {
	winston.loggers.add("reflection", {
		format: reflectionLoggerFormat,
		transports: [
			new winston.transports.Console({
				level: "silly",
				silent: process.env.NODE_ENV === "test",
			}),
		],
	});
}
const logger: ZWaveLogger = winston.loggers.get("reflection");

export function define(name: string, type: string, message: string): void {
	logger.log({
		level: REFLECTION_LOGLEVEL,
		primaryTags: tagify([name]),
		secondaryTags: tagify([type]),
		message,
		direction: getDirectionPrefix("outbound"),
	});
}
