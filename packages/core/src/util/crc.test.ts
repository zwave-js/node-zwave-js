import test from "ava";
import { CRC16_CCITT } from "./crc";

// Test cases based on http://srecord.sourceforge.net/crc16-ccitt.html

test("CRC16_CCITT() works correctly -> input: (empty)", (t) => {
	t.is(CRC16_CCITT(Buffer.from([])), 0x1d0f);
});

test("CRC16_CCITT() works correctly -> input: A", (t) => {
	t.is(CRC16_CCITT(Buffer.from("A", "ascii")), 0x9479);
});

test("CRC16_CCITT() works correctly -> input: 123456789", (t) => {
	t.is(CRC16_CCITT(Buffer.from("123456789", "ascii")), 0xe5cc);
});

test("CRC16_CCITT() works correctly -> input: A x 256", (t) => {
	t.is(CRC16_CCITT(Buffer.alloc(256, "A", "ascii")), 0xe938);
});

test("CRC16_CCITT() works correctly -> chained with start values", (t) => {
	const input = "123456789";
	let crc: number | undefined;
	for (let i = 0; i < input.length; i++) {
		crc = CRC16_CCITT(Buffer.from(input[i], "ascii"), crc);
	}
	t.is(crc, 0xe5cc);
});
