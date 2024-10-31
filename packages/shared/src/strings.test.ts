import test from "ava";

import { Bytes } from "./Bytes.js";
import {
	cpp2js,
	isPrintableASCIIWithWhitespace,
	num2hex,
	stringToUint8ArrayUTF16BE,
	uint8ArrayToStringUTF16BE,
} from "./strings.js";

test("cpp2js() -> should truncate null-terminated strings", (t) => {
	const testCases = [
		["abc\0def", "abc"],
		["\0def", ""],
		["abcdef\0", "abcdef"],
	];
	for (const [inp, out] of testCases) {
		t.is(cpp2js(inp), out);
	}
});

test("cpp2js() -> should just return non-terminated strings", (t) => {
	const testCases = ["abc", "def", "abcdef"];
	for (const tc of testCases) {
		t.is(cpp2js(tc), tc);
	}
});

test(`num2hex() -> should return "undefined" when the input is null or undefined`, (t) => {
	t.is(num2hex(null), "undefined");
	t.is(num2hex(undefined), "undefined");
});

test("num2hex() -> should return an even number lowercase hex digits prefixed with 0x", (t) => {
	const testCases: [number, string][] = [
		[1, "0x01"],
		[0xfed, "0x0fed"],
	];
	for (const [inp, out] of testCases) {
		t.is(num2hex(inp), out);
	}
});

test("num2hex() -> when the uppercase parameter is true, the hex digits should be uppercase", (t) => {
	t.is(num2hex(0xabc123, true), "0xABC123");
});

test("isPrintableASCIIWithWhitespace() -> should return true for ASCII strings that start or end with newlines", (t) => {
	const testCases = [
		["abcdef\n\r", true],
		["\n\r", true],
		["", true],
		["\r\n \n\r", true],
		["ß", false],
		["\r\nß\r\n", false],
	] as const;
	for (const [inp, result] of testCases) {
		t.is(isPrintableASCIIWithWhitespace(inp), result);
	}
});

test("stringToUint8ArrayUTF16BE / uint8ArrayToStringUTF16BE", (t) => {
	const testCases = [
		["a", [0x00, 0x61]],
		["\u00e4", [0x00, 0xe4]],
		["🐔", [0xd8, 0x3d, 0xdc, 0x14]],
	] as const;
	for (const [inp, out] of testCases) {
		// One way
		t.deepEqual(stringToUint8ArrayUTF16BE(inp), Bytes.from(out));
		// And back
		t.is(uint8ArrayToStringUTF16BE(Bytes.from(out)), inp);
	}
});
