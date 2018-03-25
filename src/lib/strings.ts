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
