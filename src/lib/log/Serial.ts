import { TransformableInfo, TransformFunction } from "logform";
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

function messageFitsIntoOneLine(info: TransformableInfo): boolean {
	const totalLengthWithoutPostfix = [
		3,
		info.message.length,
		(info.prefix || "").length,
	]
		// filter out empty parts
		.filter(len => len > 0)
		// simulate adding spaces between parts
		.reduce((prev, val) => prev + (prev > 0 ? 1 : 0) + val);
	return totalLengthWithoutPostfix <= 80;
}

const serialFormatter = {
	transform: (info => {
		if (messageFitsIntoOneLine(info)) {
			info[messageSymbol as any] = [
				info.direction,
				info.prefix,
				info.message,
				info.postfix,
			]
				.filter(item => !!item)
				.join(" ");
		} else {
			const lines: string[] = [];
			lines.push(
				[info.direction, info.prefix, info.postfix]
					.filter(item => !!item)
					.join(" "),
			);
			let message = info.message;
			while (message.length) {
				const cut = Math.min(76, message.length);
				lines.push(message.substr(0, cut));
				message = message.substr(cut);
			}
			info[messageSymbol as any] = lines.join("\n    ");
		}
		return info;
	}) as TransformFunction,
};

export const serialLoggerFormat = combine(
	label({ label: SERIAL_LABEL }),
	timestamp(),
	serialFormatter,
	colorize({ all: true }),
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
		postfix: `(${data.length} bytes)`,
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
		prefix: "Buffer :=",
		message: `0x${data.toString("hex")}`,
		postfix: `(${data.length} bytes)`,
		direction: getDirectionPrefix("none"),
	});
}
