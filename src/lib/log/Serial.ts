import * as colors from "ansi-colors";
import { TransformableInfo, TransformFunction } from "logform";
import * as winston from "winston";
import { MessageHeaders } from "../message/Constants";
import { num2hex } from "../util/strings";
import { colorizer } from "./Colorizer";
import { DataDirection, getDirectionPrefix, messageSymbol } from "./shared";
const { combine, timestamp, label } = winston.format;

const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";
/** An invisible char with length >= 0 */
// This is necessary to "print" zero spaces for the right padding
// There's probably a nicer way
const INVISIBLE = colors.black("\u001b[39m");

function calculateFirstLineLength(
	info: TransformableInfo,
	includeMessage: boolean = true,
): number {
	return (
		[
			3,
			includeMessage ? info.message.length : 0,
			(info.prefix || "").length,
			(info.postfix || "").length,
		]
			// filter out empty parts
			.filter(len => len > 0)
			// simulate adding spaces between parts
			.reduce((prev, val) => prev + (prev > 0 ? 1 : 0) + val)
	);
}

function messageFitsIntoOneLine(info: TransformableInfo): boolean {
	const totalLength = calculateFirstLineLength(info);
	return totalLength <= 80;
}

const serialFormatter = {
	transform: (info => {
		info.multiline = !messageFitsIntoOneLine(info);
		// Align postfixes to the right
		if (info.postfix) {
			// Calculate how many spaces are needed to right-align the postfix
			// Subtract 1 because the parts are joined by spaces
			info.postfixPadding = Math.max(
				-1, // -1 has the special meaning that we skip printing this
				// 0 is an invisible char
				80 - 1 - calculateFirstLineLength(info, !info.multiline),
			);
		}

		if (info.multiline) {
			// Break long messages into multiple lines
			const lines: string[] = [];
			let message = info.message;
			while (message.length) {
				const cut = Math.min(76, message.length);
				lines.push(message.substr(0, cut));
				message = message.substr(cut);
			}
			info.message = lines.join("\n");
		}
		return info;
	}) as TransformFunction,
};

const serialPrinter = {
	transform: (info => {
		const firstLine = [
			info.direction,
			info.prefix,
			info.multiline ? "" : info.message,
			info.postfixPadding < 0
				? undefined
				: info.postfixPadding === 0
				? INVISIBLE
				: " ".repeat(info.postfixPadding),
			info.postfix,
		]
			.filter(item => !!item)
			.join(" ");
		const lines = [firstLine];
		if (info.multiline) {
			lines.push(...info.message.split("\n").map(line => "    " + line));
		}
		info[messageSymbol as any] = lines.join("\n");
		return info;
	}) as TransformFunction,
};

export const serialLoggerFormat = combine(
	label({ label: SERIAL_LABEL }),
	timestamp(),
	serialFormatter,
	colorizer(),
	serialPrinter,
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
		message: `[${MessageHeaders[header]}]`,
		postfix: `(${num2hex(header)})`,
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
