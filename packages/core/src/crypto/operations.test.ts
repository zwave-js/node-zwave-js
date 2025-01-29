import { Bytes } from "@zwave-js/shared/safe";
import { type ExpectStatic, test } from "vitest";
import { computeCMAC, computeMAC } from "./operations.js";

function assertBufferEquals(
	expect: ExpectStatic,
	actual: Uint8Array,
	expected: Uint8Array,
) {
	expect(Uint8Array.from(actual)).toStrictEqual(Uint8Array.from(expected));
}

test(`computeMAC() -> should work correctly`, async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	// The Z-Wave specs use 16 zeros, but we only found test vectors for this
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Bytes.from("7649abac8119b246", "hex");
	const actual = await computeMAC(plaintext, key, iv);
	assertBufferEquals(t.expect, actual, expected);
});

test(`computeMAC() -> should work correctly (part 2)`, async (t) => {
	// Taken from real Z-Wave communication - if anything must be changed, this is the test case to keep!
	const key = Bytes.from("c5fe1ca17d36c992731a0c0c468c1ef9", "hex");
	const plaintext = Bytes.from(
		"ddd360c382a437514392826cbba0b3128114010cf3fb762d6e82126681c18597",
		"hex",
	);
	const expected = Bytes.from("2bc20a8aa9bbb371", "hex");
	const actual = await computeMAC(plaintext, key);
	assertBufferEquals(t.expect, actual, expected);
});

test(`computeCMAC() -> should work correctly (part 1)`, async (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Bytes.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = new Bytes();
	const expected = Bytes.from("BB1D6929E95937287FA37D129B756746", "hex");
	const actual = await computeCMAC(plaintext, key);
	assertBufferEquals(t.expect, actual, expected);
});

test(`computeCMAC() -> should work correctly (part 2)`, async (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Bytes.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Bytes.from("6BC1BEE22E409F96E93D7E117393172A", "hex");
	const expected = Bytes.from("070A16B46B4D4144F79BDD9DD04A287C", "hex");
	const actual = await computeCMAC(plaintext, key);
	assertBufferEquals(t.expect, actual, expected);
});

test(`computeCMAC() -> should work correctly (part 3)`, async (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Bytes.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Bytes.from(
		"6BC1BEE22E409F96E93D7E117393172AAE2D8A57",
		"hex",
	);
	const expected = Bytes.from("7D85449EA6EA19C823A7BF78837DFADE", "hex");
	const actual = await computeCMAC(plaintext, key);
	assertBufferEquals(t.expect, actual, expected);
});

test(`computeCMAC() -> should work correctly (part 4)`, async (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Bytes.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Bytes.from(
		"6BC1BEE22E409F96E93D7E117393172AAE2D8A571E03AC9C9EB76FAC45AF8E5130C81C46A35CE411E5FBC1191A0A52EFF69F2445DF4F9B17AD2B417BE66C3710",
		"hex",
	);
	const expected = Bytes.from("51F0BEBF7E3B9D92FC49741779363CFE", "hex");
	const actual = await computeCMAC(plaintext, key);
	assertBufferEquals(t.expect, actual, expected);
});
