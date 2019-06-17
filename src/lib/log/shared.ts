import * as colors from "ansi-colors";
import { Format, TransformableInfo, TransformFunction } from "logform";
import { MESSAGE } from "triple-beam";

/** An invisible char with length >= 0 */
// This is necessary to "print" zero spaces for the right padding
// There's probably a nicer way
export const INVISIBLE = colors.black("\u001b[39m");

/** A list of characters to group lines */
export const BOX_CHARS = {
	top: colors.gray("┌"), // Top corner
	middle: colors.gray("│"), // vertical line
	bottom: colors.gray("└"), // bottom corner
};
export type DataDirection = "inbound" | "outbound" | "none";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getDirectionPrefix(direction: DataDirection) {
	return direction === "inbound"
		? "« "
		: direction === "outbound"
		? " »"
		: "· ";
}
/** The space the directional arrows, grouping brackets and padding occupies */
export const CONTROL_CHAR_WIDTH = 4;

/** The width of a log line in (visible) characters */
export const LOG_WIDTH = 80;

/**
 * Calculates the length the first line of a log message would occupy if it is not split
 * @param info The message and information to log
 * @param firstMessageLineLength The length of the first line of the actual message text, not including pre- and postfixes.
 */
function calculateFirstLineLength(
	info: TransformableInfo,
	firstMessageLineLength: number,
): number {
	return (
		[
			CONTROL_CHAR_WIDTH - 1,
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

/**
 * Tests if a given message fits into a single log line
 * @param info The message that should be logged
 * @param messageLength The length that should be assumed for the actual message without pre and postfixes.
 * Can be set to 0 to exclude the message from the calculation
 */
export function messageFitsIntoOneLine(
	info: TransformableInfo,
	messageLength: number,
): boolean {
	const totalLength = calculateFirstLineLength(info, messageLength);
	return totalLength <= LOG_WIDTH;
}

/** Formats the log message and calculates the necessary paddings */
export const logMessageFormatter: Format = {
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
				// -1 has the special meaning that we don't print any padding,
				// because the message takes all the available space
				-1,
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
							: LOG_WIDTH - CONTROL_CHAR_WIDTH,
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

/** Prints a formatted and colorized log message */
export const logMessagePrinter: Format = {
	transform: (info => {
		// The formatter has already split the message into multiple lines
		const messageLines = info.message.split("\n");
		// Format the first message line
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
		// The directional arrows and the optional grouping lines must be prepended
		// without adding spaces
		firstLine =
			info.direction +
			(info.multiline ? BOX_CHARS.top : " ") +
			" " +
			firstLine;
		const lines = [firstLine];
		if (info.multiline) {
			// Format all message lines but the first
			lines.push(
				...messageLines.slice(1).map(
					(line, i, arr) =>
						// Skip the columns for directional arrows
						"  " +
						// Prepend each grouped line with the correct box printing characters
						(i < arr.length - 1
							? BOX_CHARS.middle
							: BOX_CHARS.bottom) +
						" " +
						line,
				),
			);
		}
		info[MESSAGE] = lines.join("\n");
		return info;
	}) as TransformFunction,
};
