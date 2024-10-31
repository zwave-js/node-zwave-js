import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import { CRC16_CCITT } from "./crc.js";

// Test cases based on http://srecord.sourceforge.net/crc16-ccitt.html

test("CRC16_CCITT() works correctly -> input: (empty)", (t) => {
	t.expect(CRC16_CCITT(new Bytes())).toBe(0x1d0f);
});

test("CRC16_CCITT() works correctly -> input: A", (t) => {
	t.expect(CRC16_CCITT(Bytes.from("A", "ascii"))).toBe(0x9479);
});

test("CRC16_CCITT() works correctly -> input: 123456789", (t) => {
	t.expect(CRC16_CCITT(Bytes.from("123456789", "ascii"))).toBe(0xe5cc);
});

test("CRC16_CCITT() works correctly -> input: A x 256", (t) => {
	t.expect(CRC16_CCITT(new Uint8Array(256).fill("A".charCodeAt(0)))).toBe(
		0xe938,
	);
});

test("CRC16_CCITT() works correctly -> chained with start values", (t) => {
	const input = "123456789";
	let crc: number | undefined;
	for (let i = 0; i < input.length; i++) {
		crc = CRC16_CCITT(Bytes.from(input[i], "ascii"), crc);
	}
	t.expect(crc).toBe(0xe5cc);
});
