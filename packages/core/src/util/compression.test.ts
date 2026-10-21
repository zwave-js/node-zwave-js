import { gzipSync } from "fflate";
import { expect, test } from "vitest";

import { gunzipSync } from "./compression.js";

test("gunzipSync() decompresses data within the limit", () => {
	const data = new Uint8Array(100_000).fill(0x42);
	const compressed = gzipSync(data);
	expect(new Uint8Array(gunzipSync(compressed, 100_000))).toEqual(data);
	expect(new Uint8Array(gunzipSync(compressed))).toEqual(data);
});

test("gunzipSync() throws when the decompressed data exceeds the limit", () => {
	const compressed = gzipSync(new Uint8Array(100_000).fill(0x42));
	expect(() => gunzipSync(compressed, 99_999)).toThrow();
});

test("gunzipSync() throws for empty or truncated input when a limit is given", () => {
	const compressed = gzipSync(new Uint8Array(100_000).fill(0x42));
	for (const data of [
		new Uint8Array(0),
		compressed.subarray(0, 3),
		compressed.subarray(0, 10),
		compressed.subarray(0, 18),
		compressed.subarray(0, -4),
		compressed.subarray(0, -10),
	]) {
		expect(() => gunzipSync(data, 100_000)).toThrow();
	}
});
