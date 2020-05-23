import * as crypto from "crypto";
import {
	computeMAC,
	decryptAES128OFB,
	encryptAES128ECB,
	encryptAES128OFB,
} from "./crypto";

describe("lib/util/crypto", () => {
	describe("encryptAES128OFB() / decryptAES128OFB()", () => {
		it("should be able to en- and decrypt the same data", () => {
			const plaintextIn =
				"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam";
			const key = crypto.randomBytes(16);
			const iv = crypto.randomBytes(16);
			const ciphertext = encryptAES128OFB(
				Buffer.from(plaintextIn),
				key,
				iv,
			);
			const plaintextOut = decryptAES128OFB(
				ciphertext,
				key,
				iv,
			).toString();
			expect(plaintextIn).toBe(plaintextOut);
		});
	});

	describe("encryptAES128ECB", () => {
		it("should work correctly", () => {
			// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
			const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
			const plaintext = Buffer.from(
				"6bc1bee22e409f96e93d7e117393172a",
				"hex",
			);
			const expected = Buffer.from(
				"3ad77bb40d7a3660a89ecaf32466ef97",
				"hex",
			);

			expect(encryptAES128ECB(plaintext, key)).toEqual(expected);
		});
	});

	describe("encryptAES128OFB", () => {
		it("should work correctly", () => {
			// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
			const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
			const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
			const plaintext = Buffer.from(
				"6bc1bee22e409f96e93d7e117393172a",
				"hex",
			);
			const expected = Buffer.from(
				"3b3fd92eb72dad20333449f8e83cfb4a",
				"hex",
			);

			expect(encryptAES128OFB(plaintext, key, iv)).toEqual(expected);
		});
	});

	describe("encryptAES128OFB", () => {
		it("should correctly decrypt a real packet", () => {
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
			expect(plaintext).toEqual(expected);
		});
	});

	describe("computeMAC", () => {
		it("should work correctly", () => {
			// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
			const key = Buffer.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
			// The Z-Wave specs use 16 zeros, but we only found test vectors for this
			const iv = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
			const plaintext = Buffer.from(
				"6bc1bee22e409f96e93d7e117393172a",
				"hex",
			);
			const expected = Buffer.from("7649abac8119b246", "hex");

			expect(computeMAC(plaintext, key, iv)).toEqual(expected);
		});

		// TODO: One of these two is correct (depending on the final() call)
		// it("should work correctly", () => {
		// 	// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
		// 	const key = Buffer.from("00000000000000000000000000000000", "hex");
		// 	const plaintext = Buffer.from(
		// 		"00000000000000000000000000000000",
		// 		"hex",
		// 	);
		// 	const expected = Buffer.from("8A05FC5E095AF484", "hex");

		// 	expect(computeMAC(plaintext, key)).toEqual(expected);
		// });
	});
});
