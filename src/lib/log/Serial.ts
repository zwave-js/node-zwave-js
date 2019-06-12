import { TransformableInfo, TransformFunction } from "logform";
import * as winston from "winston";
import { MessageHeaders } from "../message/Constants";
import { num2hex } from "../util/strings";
import { colorizer } from "./Colorizer";
import {
	BOX_CHARS,
	DataDirection,
	getDirectionPrefix,
	INVISIBLE,
	LOG_WIDTH,
	messageSymbol,
} from "./shared";
const { combine, timestamp, label } = winston.format;

const SERIAL_LABEL = "SERIAL";
const SERIAL_LOGLEVEL = "debug";

/** Calculates the length a log message would occupy if it is not split */
function calculateFirstLineLength(
	info: TransformableInfo,
	firstMessageLineLength: number,
): number {
	return (
		[
			3,
			firstMessageLineLength,
			(info.prefix || "").length,
			(info.postfix || "").length,
		]
			// filter out empty parts
			.filter(len => len > 0)
			// simulate adding spaces between parts
			.reduce((prev, val) => prev + (prev > 0 ? 1 : 0) + val)
	);
}

function messageFitsIntoOneLine(
	info: TransformableInfo,
	messageLength: number,
): boolean {
	const totalLength = calculateFirstLineLength(info, messageLength);
	return totalLength <= LOG_WIDTH;
}

const serialFormatter = {
	transform: (info => {
		const messageLines = info.message.split("\n");
		const firstMessageLineLength = messageLines[0].length;
		info.multiline =
			messageLines.length > 1 ||
			!messageFitsIntoOneLine(info, info.message.length);
		// Align postfixes to the right
		if (info.postfix) {
			// Calculate how many spaces are needed to right-align the postfix
			// Subtract 1 because the parts are joined by spaces
			info.postfixPadding = Math.max(
				-1, // -1 has the special meaning that we skip printing this
				// 0 is an invisible char
				LOG_WIDTH -
					1 -
					calculateFirstLineLength(info, firstMessageLineLength),
			);
		}

		if (info.multiline) {
			// Break long messages into multiple lines
			const lines: string[] = [];
			let isFirstLine = true;
			for (let message of messageLines) {
				while (message.length) {
					const cut = Math.min(
						message.length,
						isFirstLine
							? LOG_WIDTH - calculateFirstLineLength(info, 0) - 1
							: LOG_WIDTH - 4,
					);
					isFirstLine = false;
					lines.push(message.substr(0, cut));
					message = message.substr(cut);
				}
			}
			info.message = lines.join("\n");
		}
		return info;
	}) as TransformFunction,
};

const serialPrinter = {
	transform: (info => {
		const messageLines = info.message.split("\n");
		let firstLine = [
			info.prefix,
			messageLines[0],
			info.postfixPadding < 0
				? undefined
				: info.postfixPadding === 0
				? INVISIBLE
				: " ".repeat(info.postfixPadding),
			info.postfix,
		]
			.filter(item => !!item)
			.join(" ");
		firstLine =
			info.direction + (info.multiline ? BOX_CHARS.top : " ") + firstLine;
		const lines = [firstLine];
		if (info.multiline) {
			lines.push(
				...messageLines
					.slice(1)
					.map(
						(line, i, arr) =>
							"   " +
							(i < arr.length - 1
								? BOX_CHARS.middle
								: BOX_CHARS.bottom) +
							line,
					),
			);
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
