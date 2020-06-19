import { CRC16_CCITT } from "./crc";

describe("lib/util/crc", () => {
	describe("CRC16_CCITT() works correctly", () => {
		// Test cases based on http://srecord.sourceforge.net/crc16-ccitt.html
		it("input: (empty)", () => {
			expect(CRC16_CCITT(Buffer.from([]))).toBe(0x1d0f);
		});

		it("input: A", () => {
			expect(CRC16_CCITT(Buffer.from("A", "ascii"))).toBe(0x9479);
		});

		it("input: 123456789", () => {
			expect(CRC16_CCITT(Buffer.from("123456789", "ascii"))).toBe(0xe5cc);
		});

		it("input: A x 256", () => {
			expect(CRC16_CCITT(Buffer.alloc(256, "A", "ascii"))).toBe(0xe938);
		});

		it("chained with start values", () => {
			const input = "123456789";
			let crc: number | undefined;
			for (let i = 0; i < input.length; i++) {
				crc = CRC16_CCITT(Buffer.from(input[i], "ascii"), crc);
			}
			expect(crc).toBe(0xe5cc);
		});
	});
});
