import * as colors from "ansi-colors";

/** The width of a log line in (visible) characters */
export const LOG_WIDTH = 80;
/** An invisible char with length >= 0 */
// This is necessary to "print" zero spaces for the right padding
// There's probably a nicer way
export const INVISIBLE = colors.black("\u001b[39m");
/** A list of characters to group lines */
export const BOX_CHARS = {
	top: colors.gray("\u256D"), // Top corner
	middle: colors.gray("\u2502"), // vertical line
	bottom: colors.gray("\u2570"), // bottom corner
};
export type DataDirection = "inbound" | "outbound" | "none";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getDirectionPrefix(direction: DataDirection) {
	return direction === "inbound"
		? "«  "
		: direction === "outbound"
		? "  »"
		: " · ";
}

/** This is used as a property key for formatted winston messages */
export const messageSymbol = Symbol.for("message");
