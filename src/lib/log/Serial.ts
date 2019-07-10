import * as winston from "winston";
import { MessageHeaders } from "../message/Constants";
import { num2hex } from "../util/strings";
import {
	createConsoleTransport,
	createLoggerFormat,
	DataDirection,
	getDirectionPrefix,
	ZWaveLogger,
} from "./shared";

const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";

export const serialLoggerFormat = createLoggerFormat(SERIAL_LABEL);

if (!winston.loggers.has("serial")) {
	winston.loggers.add("serial", {
		format: serialLoggerFormat,
		transports: [createConsoleTransport()],
	});
}
const logger: ZWaveLogger = winston.loggers.get("serial");

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
		message: `[${MessageHeaders[header]}]`,
		secondaryTags: `(${num2hex(header)})`,
		direction: getDirectionPrefix(direction),
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
		message: `0x${data.toString("hex")}`,
		secondaryTags: `(${data.length} bytes)`,
		direction: getDirectionPrefix(direction),
	});
}

/**
 * Logs the current content of the receive buffer
 * @param data The data that is currently in the receive buffer
 */
export function receiveBuffer(data: Buffer): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		primaryTags: "Buffer :=",
		message: `0x${data.toString("hex")}`,
		secondaryTags: `(${data.length} bytes)`,
		direction: getDirectionPrefix("none"),
	});
}

/**
 * Logs a message
 * @param msg The message to output
 */
export function message(message: string): void {
	logger.log({
		level: SERIAL_LOGLEVEL,
		message,
		direction: getDirectionPrefix("none"),
	});
}
