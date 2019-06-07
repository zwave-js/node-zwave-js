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
	logMessageHeader(direction, MessageHeaders.ACK);
}

/**
 * Logs transmission or receipt of an NAK frame
 * @param direction The direction this NAK was sent
 */
export function NAK(direction: DataDirection): void {
	logMessageHeader(direction, MessageHeaders.NAK);
}

/**
 * Logs transmission or receipt of an CAN frame
 * @param direction The direction this CAN was sent
 */
export function CAN(direction: DataDirection): void {
	logMessageHeader(direction, MessageHeaders.CAN);
}

function logMessageHeader(
	direction: DataDirection,
	header: MessageHeaders,
): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		message: `[${MessageHeaders[header]}] (${num2hex(header)})`,
		prefix: getDirectionPrefix(direction),
	});
}

/**
 * Logs transmission or receipt of a data chunk
 * @param direction The direction the data was sent
 * @param data The data that was transmitted or received
 */
export function data(direction: DataDirection, data: Buffer): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		message: `0x${data.toString("hex")} (${data.length} bytes)`,
		prefix: getDirectionPrefix(direction),
	});
}

/**
 * Logs the current content of the receive buffer
 * @param data The data that is currently in the receive buffer
 */
export function receiveBuffer(data: Buffer): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		message: `Buffer := 0x${data.toString("hex")} (${data.length} bytes)`,
		prefix: getDirectionPrefix("none"),
	});
}
