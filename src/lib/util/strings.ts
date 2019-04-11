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

export function stringify(arg: any): string {
	return JSON.stringify(arg, null, 4);
}
