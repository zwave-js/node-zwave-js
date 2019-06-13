import * as colors from "ansi-colors";

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
