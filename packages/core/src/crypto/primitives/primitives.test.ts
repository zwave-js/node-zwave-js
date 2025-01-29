import { type CryptoPrimitives } from "@zwave-js/shared/bindings";
import { Bytes } from "@zwave-js/shared/safe";
import { type ExpectStatic, test } from "vitest";

function assertBufferEquals(
	expect: ExpectStatic,
	actual: Uint8Array,
	expected: Uint8Array,
) {
	expect(Uint8Array.from(actual)).toStrictEqual(Uint8Array.from(expected));
}

for (
	const primitives of [
		"./primitives.browser.js",
		"./primitives.node.js",
	] as const
) {
	const {
		decryptAES128OFB,
		encryptAES128ECB,
		encryptAES128OFB,
		encryptAES128CCM,
		decryptAES128CCM,
		randomBytes,
	}: CryptoPrimitives = (await import(primitives)).primitives;

	test(`${primitives} -> encryptAES128ECB() -> should work correctly`, async (t) => {
		// // Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
		const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
		const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
		const expected = Bytes.from("3ad77bb40d7a3660a89ecaf32466ef97", "hex");
		const actual = await encryptAES128ECB(plaintext, key);
		assertBufferEquals(t.expect, actual, expected);
	});

	test(`${primitives} -> encryptAES128OFB() -> should work correctly, part 1`, async (t) => {
		// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
		const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
		const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
		const plaintext = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
		const expected = Bytes.from("3b3fd92eb72dad20333449f8e83cfb4a", "hex");
		const actual = await encryptAES128OFB(plaintext, key, iv);
		assertBufferEquals(t.expect, actual, expected);
	});

	test(`${primitives} -> encryptAES128OFB() -> should work correctly, part 2`, async (t) => {
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
		assertBufferEquals(t.expect, actual, expected);
	});

	test(`${primitives} -> decryptAES128OFB() -> should work correctly, part 1`, async (t) => {
		// Test vector taken from https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38a.pdf
		const key = Bytes.from("2b7e151628aed2a6abf7158809cf4f3c", "hex");
		const iv = Bytes.from("000102030405060708090a0b0c0d0e0f", "hex");
		const ciphertext = Bytes.from(
			"3b3fd92eb72dad20333449f8e83cfb4a",
			"hex",
		);
		const expected = Bytes.from("6bc1bee22e409f96e93d7e117393172a", "hex");
		const actual = await decryptAES128OFB(ciphertext, key, iv);
		assertBufferEquals(t.expect, actual, expected);
	});

	test(`${primitives} -> decryptAES128OFB() -> should work correctly, part 2`, async (t) => {
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
		assertBufferEquals(t.expect, actual, expected);
	});

	test(`${primitives} -> decryptAES128OFB() -> should correctly decrypt a real packet`, async (t) => {
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
		assertBufferEquals(t.expect, plaintext, expected);
	});

	test(`${primitives} -> encryptAES128OFB() / decryptAES128OFB() -> should be able to en- and decrypt the same data`, async (t) => {
		const plaintextIn =
			"Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam";
		const key = randomBytes(16);
		const iv = randomBytes(16);
		const ciphertext = await encryptAES128OFB(
			Bytes.from(plaintextIn),
			key,
			iv,
		);
		const plaintextBuffer = await decryptAES128OFB(ciphertext, key, iv);
		const plaintextOut = Bytes.view(plaintextBuffer).toString();
		t.expect(plaintextOut).toBe(plaintextIn);
	});

	test(`${primitives} -> encryptAES128CCM() -> should work correctly (part 1)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("10111213141516", "hex");
		const additionalData = Bytes.from("0001020304050607", "hex");
		const plaintext = Bytes.from("20212223", "hex");
		const expectedCiphertext = Bytes.from("7162015b", "hex");
		const expectedAuthTag = Bytes.from("4dac255d", "hex");
		const actual = await encryptAES128CCM(
			plaintext,
			key,
			iv,
			additionalData,
			expectedAuthTag.length,
		);
		assertBufferEquals(t.expect, actual.ciphertext, expectedCiphertext);
		assertBufferEquals(t.expect, actual.authTag, expectedAuthTag);
	});

	test(`${primitives} -> encryptAES128CCM() -> should work correctly (part 2)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("1011121314151617", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f",
			"hex",
		);
		const plaintext = Bytes.from("202122232425262728292a2b2c2d2e2f", "hex");
		const expectedCiphertext = Bytes.from(
			"d2a1f0e051ea5f62081a7792073d593d",
			"hex",
		);
		const expectedAuthTag = Bytes.from("1fc64fbfaccd", "hex");
		const actual = await encryptAES128CCM(
			plaintext,
			key,
			iv,
			additionalData,
			expectedAuthTag.length,
		);
		assertBufferEquals(t.expect, actual.ciphertext, expectedCiphertext);
		assertBufferEquals(t.expect, actual.authTag, expectedAuthTag);
	});

	test(`${primitives} -> encryptAES128CCM() -> should work correctly (part 3)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("101112131415161718191a1b", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f10111213",
			"hex",
		);
		const plaintext = Bytes.from(
			"202122232425262728292a2b2c2d2e2f3031323334353637",
			"hex",
		);
		const expectedCiphertext = Bytes.from(
			"e3b201a9f5b71a7a9b1ceaeccd97e70b6176aad9a4428aa5",
			"hex",
		);
		const expectedAuthTag = Bytes.from("484392fbc1b09951", "hex");
		const actual = await encryptAES128CCM(
			plaintext,
			key,
			iv,
			additionalData,
			expectedAuthTag.length,
		);
		assertBufferEquals(t.expect, actual.ciphertext, expectedCiphertext);
		assertBufferEquals(t.expect, actual.authTag, expectedAuthTag);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 1)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("10111213141516", "hex");
		const additionalData = Bytes.from("0001020304050607", "hex");

		const ciphertext = Bytes.from("7162015b", "hex");
		const authTag = Bytes.from("4dac255d", "hex");

		const expectedPlaintext = Bytes.from("20212223", "hex");
		const expectedAuthOK = true;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 2)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("1011121314151617", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f",
			"hex",
		);

		const ciphertext = Bytes.from(
			"d2a1f0e051ea5f62081a7792073d593d",
			"hex",
		);
		const authTag = Bytes.from("1fc64fbfaccd", "hex");

		const expectedPlaintext = Bytes.from(
			"202122232425262728292a2b2c2d2e2f",
			"hex",
		);
		const expectedAuthOK = true;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 3)`, async (t) => {
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("101112131415161718191a1b", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f10111213",
			"hex",
		);

		const ciphertext = Bytes.from(
			"e3b201a9f5b71a7a9b1ceaeccd97e70b6176aad9a4428aa5",
			"hex",
		);
		const authTag = Bytes.from("484392fbc1b09951", "hex");

		const expectedPlaintext = Bytes.from(
			"202122232425262728292a2b2c2d2e2f3031323334353637",
			"hex",
		);
		const expectedAuthOK = true;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 4)`, async (t) => {
		// Like part 3, but the additional data was changed
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("101112131415161718191a1b", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f101112",
			"hex",
		);

		const ciphertext = Bytes.from(
			"e3b201a9f5b71a7a9b1ceaeccd97e70b6176aad9a4428aa5",
			"hex",
		);
		const authTag = Bytes.from("484392fbc1b09951", "hex");

		const expectedPlaintext = new Uint8Array();
		const expectedAuthOK = false;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 5)`, async (t) => {
		// Like part 2, but the ciphertext was changed
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("1011121314151617", "hex");
		const additionalData = Bytes.from(
			"000102030405060708090a0b0c0d0e0f",
			"hex",
		);

		const ciphertext = Bytes.from(
			"d2a1f0e051ea5f62081a7792073d593e",
			"hex",
		);
		const authTag = Bytes.from("1fc64fbfaccd", "hex");

		const expectedPlaintext = new Uint8Array();
		const expectedAuthOK = false;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});

	test(`${primitives} -> decryptAES128CCM() -> should work correctly (part 6)`, async (t) => {
		// Like part 1, but the authTag was changed
		const key = Bytes.from("404142434445464748494a4b4c4d4e4f", "hex");
		const iv = Bytes.from("10111213141516", "hex");
		const additionalData = Bytes.from("0001020304050607", "hex");

		const ciphertext = Bytes.from("7162015b", "hex");
		const authTag = Bytes.from("4dac25555566", "hex");

		const expectedPlaintext = new Uint8Array();
		const expectedAuthOK = false;
		const actual = await decryptAES128CCM(
			ciphertext,
			key,
			iv,
			additionalData,
			authTag,
		);

		assertBufferEquals(t.expect, actual.plaintext, expectedPlaintext);
		t.expect(actual.authOK).toBe(expectedAuthOK);
	});
}

test("ECDH key pairs have the same size in all implementations", async (t) => {
	const {
		generateECDHKeyPair: generateECDHKeyPairBrowser,
	}: CryptoPrimitives = (await import("./primitives.browser.js")).primitives;

	const {
		generateECDHKeyPair: generateECDHKeyPairNode,
	}: CryptoPrimitives = (await import("./primitives.node.js")).primitives;

	const keyPairBrowser = await generateECDHKeyPairBrowser();
	const keyPairNode = await generateECDHKeyPairNode();

	t.expect(keyPairBrowser.publicKey.length).toBe(32);
	t.expect(keyPairNode.publicKey.length).toBe(32);
	t.expect(keyPairBrowser.privateKey.length).toBe(32);
	t.expect(keyPairNode.privateKey.length).toBe(32);
});

test("./primitives.browser.js -> keyPairFromRawECDHPrivateKey", async (t) => {
	const {
		generateECDHKeyPair,
		keyPairFromRawECDHPrivateKey,
	}: CryptoPrimitives = (await import("./primitives.browser.js")).primitives;

	const keyPair = await generateECDHKeyPair();
	const keyPairFromPrivateKey = await keyPairFromRawECDHPrivateKey(
		keyPair.privateKey,
	);
	t.expect(keyPairFromPrivateKey).toStrictEqual(keyPair);
});

test("./primitives.node.js -> keyPairFromRawECDHPrivateKey", async (t) => {
	const {
		generateECDHKeyPair,
		keyPairFromRawECDHPrivateKey,
	}: CryptoPrimitives = (await import("./primitives.node.js")).primitives;

	const keyPair = await generateECDHKeyPair();
	const keyPairFromPrivateKey = await keyPairFromRawECDHPrivateKey(
		keyPair.privateKey,
	);
	t.expect(keyPairFromPrivateKey).toStrictEqual(keyPair);
});

test("deriveSharedECDHSecret is compatible between all implementations", async (t) => {
	const {
		deriveSharedECDHSecret: deriveSharedECDHSecretBrowser,
		generateECDHKeyPair: generateECDHKeyPairBrowser,
	}: CryptoPrimitives = (await import("./primitives.browser.js")).primitives;

	const {
		deriveSharedECDHSecret: deriveSharedECDHSecretNode,
		generateECDHKeyPair: generateECDHKeyPairNode,
	}: CryptoPrimitives = (await import("./primitives.node.js")).primitives;

	const keyPairBrowser = await generateECDHKeyPairBrowser();
	const keyPairNode = await generateECDHKeyPairNode();

	const secretBrowser = await deriveSharedECDHSecretBrowser({
		privateKey: keyPairBrowser.privateKey,
		publicKey: keyPairNode.publicKey,
	});

	const secretNode = await deriveSharedECDHSecretNode({
		privateKey: keyPairNode.privateKey,
		publicKey: keyPairBrowser.publicKey,
	});

	t.expect(secretBrowser).toStrictEqual(new Uint8Array(secretNode));
});
