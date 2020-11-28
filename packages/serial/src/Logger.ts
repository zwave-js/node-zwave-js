import * as Sentry from "@sentry/node";
import {
	createLoggerFormat,
	DataDirection,
	getConfiguredTransports,
	getDirectionPrefix,
	isLoglevelVisible,
	ZWaveLogger,
} from "@zwave-js/core";
import { buffer2hex, num2hex } from "@zwave-js/shared";
import winston from "winston";
import { MessageHeaders } from "./MessageHeaders";

export const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";

let _logger: ZWaveLogger | undefined;
function getLogger(): ZWaveLogger {
	if (!_logger) {
		if (!winston.loggers.has("serial")) {
			winston.loggers.add("serial", {
				transports: getConfiguredTransports(),
				format: createLoggerFormat(SERIAL_LABEL),
			});
		}
		_logger = (winston.loggers.get("serial") as unknown) as ZWaveLogger;
	}
	return _logger;
}
let _isVisible: boolean | undefined;
function isVisible(): boolean {
	if (_isVisible === undefined) {
		_isVisible = isLoglevelVisible(SERIAL_LOGLEVEL);
	}
	return _isVisible;
}

/**
 * Logs transmission or receipt of an ACK frame
 * @param direction The direction this ACK was sent
 */
export function ACK(direction: DataDirection): void {
	if (isVisible()) logMessageHeader(direction, MessageHeaders.ACK);
}

/**
 * Logs transmission or receipt of an NAK frame
 * @param direction The direction this NAK was sent
 */
export function NAK(direction: DataDirection): void {
	if (isVisible()) logMessageHeader(direction, MessageHeaders.NAK);
}

/**
 * Logs transmission or receipt of an CAN frame
 * @param direction The direction this CAN was sent
 */
export function CAN(direction: DataDirection): void {
	if (isVisible()) logMessageHeader(direction, MessageHeaders.CAN);
}

function logMessageHeader(
	direction: DataDirection,
	header: MessageHeaders,
): void {
	getLogger().log({
		level: SERIAL_LOGLEVEL,
		primaryTags: `[${MessageHeaders[header]}]`,
		message: "",
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
	if (isVisible()) {
		getLogger().log({
			level: SERIAL_LOGLEVEL,
			message: `0x${data.toString("hex")}`,
			secondaryTags: `(${data.length} bytes)`,
			direction: getDirectionPrefix(direction),
		});
	}
	if (process.env.NODE_ENV !== "test") {
		// Enrich error data in case something goes wrong
		Sentry.addBreadcrumb({
			category: "serial",
			timestamp: Date.now(),
			type: "debug",
			message: `${getDirectionPrefix(direction)}${buffer2hex(data)}`,
		});
	}
}

// /**
//  * Logs the current content of the receive buffer
//  * @param data The data that is currently in the receive buffer
//  */
// export function receiveBuffer(data: Buffer, isComplete: boolean): void {
// 	if (isVisible()) {
// 		getLogger().log({
// 			level: isComplete ? SERIAL_LOGLEVEL : "silly",
// 			primaryTags: isComplete ? undefined : "[incomplete]",
// 			message: `Buffer := 0x${data.toString("hex")}`,
// 			secondaryTags: `(${data.length} bytes)`,
// 			direction: getDirectionPrefix("none"),
// 		});
// 	}
// }

/**
 * Logs a message
 * @param msg The message to output
 */
export function message(message: string): void {
	if (isVisible()) {
		getLogger().log({
			level: SERIAL_LOGLEVEL,
			message,
			direction: getDirectionPrefix("none"),
		});
	}
}

const log = { serial: { ACK, NAK, CAN, data, message } };
export default log;
