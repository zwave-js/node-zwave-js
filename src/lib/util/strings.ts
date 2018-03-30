/**
 * Pads a string to the given length by repeatedly prepending the filler at the beginning of the string.
 * @param str The string to pad
 * @param targetLen The target length
 * @param fill The filler string to prepend. Depending on the lenght requirements, this might get truncated.
 */
export function padStart(str: string, targetLen: number, fill: string = " "): string {
	// simply return strings that are long enough to not be padded
	if (str != null && str.length >= targetLen) return str;
	// make sure that <fill> isn't empty
	if (fill == null || fill.length < 1) throw new Error("fill must be at least one char");

	// figure out how often we need to repeat <fill>
	const missingLength = targetLen - str.length;
	const repeats = Math.ceil(missingLength / fill.length);
	return fill.repeat(repeats).substr(0, missingLength) + str;
}

/** Translates a null-terminated (C++) string to JS */
export function cpp2js(str: string): string {
	const nullIndex = str.indexOf("\0");
	if (nullIndex === -1) return str;
	return str.substr(0, nullIndex);
}

export function num2hex(val: number | undefined | null): string {
	if (val == null) return "undefined";
	let ret = val.toString(16);
	if (ret.length % 2 !== 0) ret = "0" + ret;
	return "0x" + ret;
}

export function stringify(arg: any): string {
	return JSON.stringify(arg, null, 4);
}
