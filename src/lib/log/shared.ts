export type DataDirection = "inbound" | "outbound" | "none";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getDirectionPrefix(direction: DataDirection) {
	return direction === "inbound"
		? "<- "
		: direction === "outbound"
		? " ->"
		: "   ";
}

/** This is used as a property key for formatted winston messages */
export const messageSymbol = Symbol.for("message");
