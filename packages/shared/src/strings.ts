import { Bytes } from "./Bytes.js";
import { uint8ArrayToHex } from "./uint8array-extras.js";

/** Translates a null-terminated (C++) string to JS */
export function cpp2js(str: string): string {
	const nullIndex = str.indexOf("\0");
	if (nullIndex === -1) return str;
	return str.slice(0, nullIndex);
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
	return "0x" + id.padStart(4, "0").toLowerCase();
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
export function buffer2hex(
	buffer: Uint8Array,
	uppercase: boolean = false,
): string {
	if (buffer.length === 0) return "(empty)";
	let ret = uint8ArrayToHex(buffer);
	if (uppercase) ret = ret.toUpperCase();
	return "0x" + ret;
}

export function isPrintableASCII(text: string): boolean {
	return /^[\u0020-\u007e]*$/.test(text);
}

export function isPrintableASCIIWithWhitespace(text: string): boolean {
	return isPrintableASCII(text.trim());
}

export function compareStrings(a: string, b: string): number {
	if (a > b) return 1;
	if (b > a) return -1;
	return 0;
}

export function formatTime(hour: number, minute: number): string {
	return `${hour.toString().padStart(2, "0")}:${
		minute.toString().padStart(2, "0")
	}`;
}

export function formatDate(year: number, month: number, day: number): string {
	return `${year.toString().padStart(4, "0")}-${
		month.toString().padStart(2, "0")
	}-${day.toString().padStart(2, "0")}`;
}

export function stringToUint8ArrayUTF16BE(str: string): Uint8Array {
	// TextEncoder only supports UTF-8, so we have to do this manually
	const ret = new Bytes(str.length * 2);
	for (let i = 0; i < str.length; i++) {
		const code = str.charCodeAt(i);
		ret.writeUInt16BE(code, i * 2);
	}
	return ret;
}

export function uint8ArrayToStringUTF16BE(arr: Uint8Array): string {
	// TextDecoder only supports UTF-8, so we have to do this manually
	let ret = "";
	const view = Bytes.view(arr);
	for (let i = 0; i < arr.length; i += 2) {
		ret += String.fromCharCode(view.readUInt16BE(i));
	}
	return ret;
}
