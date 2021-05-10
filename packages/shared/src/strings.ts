import { padStart } from "alcalzone-shared/strings";

/** Translates a null-terminated (C++) string to JS */
export function cpp2js(str: string): string {
	const nullIndex = str.indexOf("\0");
	if (nullIndex === -1) return str;
	return str.substr(0, nullIndex);
}

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

export function formatId(id: number | string): string {
	id = typeof id === "number" ? id.toString(16) : id;
	return "0x" + padStart(id, 4, "0").toLowerCase();
}

export function stringify(arg: unknown, space: 4 | "\t" = 4): string {
	return JSON.stringify(arg, null, space);
}

export function buffer2hex(buffer: Buffer, uppercase: boolean = false): string {
	if (buffer.length === 0) return "(empty)";
	let ret = `0x${buffer.toString("hex")}`;
	if (uppercase) ret = ret.toUpperCase();
	return ret;
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
