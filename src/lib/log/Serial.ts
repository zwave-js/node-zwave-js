import { TransformFunction } from "logform";
import * as winston from "winston";
import { MessageHeaders } from "../message/Constants";
import { num2hex } from "../util/strings";
import { DataDirection, getDirectionPrefix, messageSymbol } from "./shared";
const { colorize, combine, timestamp, label } = winston.format;

const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";

// const logFormat = format.printf(info => {
// 	return `${info.timestamp} ${info.level}: ${info.message} --> ${info.label}`;
// });

const serialFormatter = {
	transform: (info => {
		info[messageSymbol as any] = `${info.prefix} ${info.message}`;
		return info;
	}) as TransformFunction,
};

export const serialLoggerFormat = combine(
	label({ label: SERIAL_LABEL }),
	timestamp(),
	colorize({ all: true }),
	serialFormatter,
);

if (!winston.loggers.has("serial")) {
	winston.loggers.add("serial", {
		format: serialLoggerFormat,
		transports: [new winston.transports.Console({ level: "silly" })],
	});
}
const logger = winston.loggers.get("serial");

/**
 * Logs transmission or receipt of an ACK frame
 * @param direction The direction this ACK was sent
 */
export function ACK(direction: DataDirection): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		message: `[ACK] (${num2hex(MessageHeaders.ACK)})`,
		prefix: getDirectionPrefix(direction),
	});
}
