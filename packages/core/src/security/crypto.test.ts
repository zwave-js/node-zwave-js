import test from "ava";
import * as crypto from "crypto";
import {
	computeCMAC,
	computeMAC,
	decryptAES128OFB,
	encryptAES128ECB,
	encryptAES128OFB,
} from "./crypto";

test("encryptAES128OFB() / decryptAES128OFB() -> should be able to en- and decrypt the same data", (t) => {
	const plaintextIn =
		"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam";
	const key = crypto.randomBytes(16);
	const iv = crypto.randomBytes(16);
	const ciphertext = encryptAES128OFB(Buffer.from(plaintextIn), key, iv);
	const plaintextOut = decryptAES128OFB(ciphertext, key, iv).toString();
	t.is(plaintextOut, plaintextIn);
});

test("encryptAES128ECB() -> should work correctly", (t) => {
	// // Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const plaintext = Buffer.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Buffer.from("3ad77bb40d7a3660a89ecaf32466ef97", "hex");
	t.deepEqual(encryptAES128ECB(plaintext, key), expected);
});

test("encryptAES128OFB() -> should work correctly", (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Buffer.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Buffer.from("3b3fd92eb72dad20333449f8e83cfb4a", "hex");
	t.deepEqual(encryptAES128OFB(plaintext, key, iv), expected);
});

test("encryptAES128OFB() -> should correctly decrypt a real packet", (t) => {
	// Taken from an OZW log:
	// Raw: 0x9881 78193fd7b91995ba 47645ec33fcdb3994b104ebd712e8b7fbd9120d049 28 4e39c14a0dc9aee5
	// Decrypted Packet: 0x009803008685598e60725a845b7170807aef2526ef
	// Nonce: 0x2866211bff3783d6
	// Network Key: 0x0102030405060708090a0b0c0d0e0f10

	const key = encryptAES128ECB(
		Buffer.alloc(16, 0xaa),
		Buffer.from("0102030405060708090a0b0c0d0e0f10", "hex"),
	);
	const iv = Buffer.from("78193fd7b91995ba2866211bff3783d6", "hex");
	const ciphertext = Buffer.from(
		"47645ec33fcdb3994b104ebd712e8b7fbd9120d049",
		"hex",
	);
	const plaintext = decryptAES128OFB(ciphertext, key, iv);
	const expected = Buffer.from(
		"009803008685598e60725a845b7170807aef2526ef",
		"hex",
	);
	t.deepEqual(plaintext, expected);
});

test("computeMAC() -> should work correctly", (t) => {
	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
	const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
	// The Z-Wave specs use 16 zeros, but we only found test vectors for this
	const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
	const plaintext = Buffer.from("6bc1bee22e409f96e93d7e117393172a", "hex");
	const expected = Buffer.from("7649abac8119b246", "hex");

	t.deepEqual(computeMAC(plaintext, key, iv), expected);
});

test("computeMAC() -> should work correctly (part 2)", (t) => {
	// Taken from real Z-Wave communication - if anything must be changed, this is the test case to keep!
	const key = Buffer.from("c5fe1ca17d36c992731a0c0c468c1ef9", "hex");
	const plaintext = Buffer.from(
		"ddd360c382a437514392826cbba0b3128114010cf3fb762d6e82126681c18597",
		"hex",
	);
	const expected = Buffer.from("2bc20a8aa9bbb371", "hex");

	t.deepEqual(computeMAC(plaintext, key), expected);
});

test("computeCMAC() -> should work correctly (part 1)", (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Buffer.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Buffer.from([]);
	const expected = Buffer.from("BB1D6929E95937287FA37D129B756746", "hex");

	t.deepEqual(computeCMAC(plaintext, key), expected);
});

test("computeCMAC() -> should work correctly (part 2)", (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Buffer.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Buffer.from("6BC1BEE22E409F96E93D7E117393172A", "hex");
	const expected = Buffer.from("070A16B46B4D4144F79BDD9DD04A287C", "hex");

	t.deepEqual(computeCMAC(plaintext, key), expected);
});

test("computeCMAC() -> should work correctly (part 3)", (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Buffer.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Buffer.from(
		"6BC1BEE22E409F96E93D7E117393172AAE2D8A57",
		"hex",
	);
	const expected = Buffer.from("7D85449EA6EA19C823A7BF78837DFADE", "hex");

	t.deepEqual(computeCMAC(plaintext, key), expected);
});

test("computeCMAC() -> should work correctly (part 4)", (t) => {
	// Test vector taken from https://csrc.nist.gov/CSRC/media/Projects/Cryptographic-Standards-and-Guidelines/documents/examples/AES_CMAC.pdf
	const key = Buffer.from("2B7E151628AED2A6ABF7158809CF4F3C", "hex");
	const plaintext = Buffer.from(
		"6BC1BEE22E409F96E93D7E117393172AAE2D8A571E03AC9C9EB76FAC45AF8E5130C81C46A35CE411E5FBC1191A0A52EFF69F2445DF4F9B17AD2B417BE66C3710",
		"hex",
	);
	const expected = Buffer.from("51F0BEBF7E3B9D92FC49741779363CFE", "hex");

	t.deepEqual(computeCMAC(plaintext, key), expected);
});
