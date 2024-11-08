import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import {
	computeMAC,
	decryptAES128OFB,
	encryptAES128ECB,
	encryptAES128OFB,
	randomBytes,
} from "./index.js";

test("encryptAES128ECB() -> should work correctly", async (t) => {
	// // Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Bytes.from("3ad77bb40d7a3660a89ecaf32466ef97", "hex");
	const actual = await encryptAES128ECB(plaintext, key);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("encryptAES128OFB() -> should work correctly, part 1", async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Bytes.from("3b3fd92eb72dad20333449f8e83cfb4a", "hex");
	const actual = await encryptAES128OFB(plaintext, key, iv);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("encryptAES128OFB() -> should work correctly, part 2", async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Bytes.from(
		"6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710",
		"hex",
	);
	const expected = Bytes.from(
		"3b3fd92eb72dad20333449f8e83cfb4a7789508d16918f03f53c52dac54ed8259740051e9c5fecf64344f7a82260edcc304c6528f659c77866a510d9c1d6ae5e",
		"hex",
	);
	const actual = await encryptAES128OFB(plaintext, key, iv);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("decryptAES128OFB() -> should work correctly, part 1", async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const ciphertext = Bytes.from("3b3fd92eb72dad20333449f8e83cfb4a", "hex");
	const expected = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const actual = await decryptAES128OFB(ciphertext, key, iv);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("decryptAES128OFB() -> should work correctly, part 2", async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const ciphertext = Bytes.from(
		"3b3fd92eb72dad20333449f8e83cfb4a7789508d16918f03f53c52dac54ed8259740051e9c5fecf64344f7a82260edcc304c6528f659c77866a510d9c1d6ae5e",
		"hex",
	);
	const expected = Bytes.from(
		"6bc1bee22e409f96e93d7e117393172aae2d8a571e03ac9c9eb76fac45af8e5130c81c46a35ce411e5fbc1191a0a52eff69f2445df4f9b17ad2b417be66c3710",
		"hex",
	);
	const actual = await decryptAES128OFB(ciphertext, key, iv);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("decryptAES128OFB() -> should correctly decrypt a real packet", async (t) => {
	// Taken from an OZW log:
	// Raw: 0x9881 78193fd7b91995ba 47645ec33fcdb3994b104ebd712e8b7fbd9120d049 28 4e39c14a0dc9aee5
	// Decrypted Packet: 0x009803008685598e60725a845b7170807aef2526ef
	// Nonce: 0x2866211bff3783d6
	// Network Key: 0x0102030405060708090a0b0c0d0e0f10

	const key = await encryptAES128ECB(
		new Uint8Array(16).fill(0xaa),
		Bytes.from("0102030405060708090a0b0c0d0e0f10", "hex"),
	);
	const iv = Bytes.from("78193fd7b91995ba2866211bff3783d6", "hex");
	const ciphertext = Bytes.from(
		"47645ec33fcdb3994b104ebd712e8b7fbd9120d049",
		"hex",
	);
	const plaintext = await decryptAES128OFB(ciphertext, key, iv);
	const expected = Bytes.from(
		"009803008685598e60725a845b7170807aef2526ef",
		"hex",
	);
	t.expect(plaintext).toStrictEqual(Uint8Array.from(expected));
});

test("encryptAES128OFB() / decryptAES128OFB() -> should be able to en- and decrypt the same data", async (t) => {
	const plaintextIn =
		"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam";
	const key = randomBytes(16);
	const iv = randomBytes(16);
	const ciphertext = await encryptAES128OFB(Bytes.from(plaintextIn), key, iv);
	const plaintextBuffer = await decryptAES128OFB(ciphertext, key, iv);
	const plaintextOut = Bytes.view(plaintextBuffer).toString();
	t.expect(plaintextOut).toBe(plaintextIn);
});

test("computeMAC() -> should work correctly", async (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	// The Z-Wave specs use 16 zeros, but we only found test vectors for this
	const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Bytes.from("7649abac8119b246", "hex");
	const actual = await computeMAC(plaintext, key, iv);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});

test("computeMAC() -> should work correctly (part 2)", async (t) => {
	// Taken from real Z-Wave communication - if anything must be changed, this is the test case to keep!
	const key = Bytes.from("c5fe1ca17d36c992731a0c0c468c1ef9", "hex");
	const plaintext = Bytes.from(
		"ddd360c382a437514392826cbba0b3128114010cf3fb762d6e82126681c18597",
		"hex",
	);
	const expected = Bytes.from("2bc20a8aa9bbb371", "hex");
	const actual = await computeMAC(plaintext, key);
	t.expect(actual).toStrictEqual(Uint8Array.from(expected));
});
