import { padStart } from "alcalzone-shared/strings";

/** Translates a null-terminated (C++) string to JS */
export function cpp2js(str: string): string {
	const nullIndex = str.indexOf("\0");
	if (nullIndex === -1) return str;
	return str.substr(0, nullIndex);
}

/**
 * Formats a number as a hexadecimal string, while making sure that the length is a multiple of two digits.
 * `undefined` and `null` get converted to `"undefined"`.
 *
 * @param val The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
export function num2hex(
	val: number | undefined | null,
	uppercase: boolean = false,
): string {
	if (val == null) return "undefined";
	let ret = val.toString(16);
	if (uppercase) ret = ret.toUpperCase();
	if (ret.length % 2 !== 0) ret = "0" + ret;
	return "0x" + ret;
}

/**
 * Formats an ID as a 4-digit lowercase hexadecimal string, to guarantee a representation that matches the Z-Wave specs.
 * This is meant to be used to display manufacturer ID, product type and product ID, etc.
 */
export function formatId(id: number | string): string {
	id = typeof id === "number" ? id.toString(16) : id;
	return "0x" + padStart(id, 4, "0").toLowerCase();
}

export function stringify(arg: unknown, space: 4 | "\t" = 4): string {
	return JSON.stringify(arg, null, space);
}

/**
 * Formats a buffer as an hexadecimal string, with an even number of digits.
 * Returns `"(empty)"` if the buffer is empty.
 *
 * @param buffer The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
export function buffer2hex(buffer: Buffer, uppercase: boolean = false): string {
	if (buffer.length === 0) return "(empty)";
	let ret = buffer.toString("hex");
	if (uppercase) ret = ret.toUpperCase();
	return "0x" + ret;
}

export function isPrintableASCII(text: string): boolean {
	return /^[\u0020-\u007e]*$/.test(text);
}

export function isPrintableASCIIWithNewlines(text: string): boolean {
	text = text.replace(/^[\r\n]*/g, "").replace(/[\r\n]*/g, "");
	return isPrintableASCII(text);
}

export function compareStrings(a: string, b: string): number {
	if (a > b) return 1;
	if (b > a) return -1;
	return 0;
}

export function formatTime(hour: number, minute: number): string {
	return `${padStart(hour.toString(), 2, "0")}:${padStart(
		minute.toString(),
		2,
		"0",
	)}`;
}

export function formatDate(year: number, month: number, day: number): string {
	return `${padStart(year.toString(), 4, "0")}-${padStart(
		month.toString(),
		2,
		"0",
	)}-${padStart(day.toString(), 2, "0")}`;
}
