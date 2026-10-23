import { Bytes } from "@zwave-js/shared";
import { describe, expect, test } from "vitest";

import { UserCredentialType } from "../lib/_Types.js";

import {
	encodeCredentialData,
	normalizeCredentialData,
} from "./UserCredentialCC.js";

describe("encodeCredentialData", () => {
	test("encodes passwords as UTF-16BE", () => {
		// The 17-character example from the 2026A specification, which gives a
		// Credential Length of 34
		const encoded = encodeCredentialData(
			UserCredentialType.Password,
			"zwavenodepassword",
		);
		expect(encoded.length).toBe(34);
		expect(encoded.subarray(0, 4)).toStrictEqual(
			Bytes.from([0x00, 0x7a, 0x00, 0x77]),
		);
	});

	test("encodes PIN codes as single bytes", () => {
		expect(
			encodeCredentialData(UserCredentialType.PINCode, "1234"),
		).toStrictEqual(Bytes.from([0x31, 0x32, 0x33, 0x34]));
	});

	test("passes binary credentials through unchanged", () => {
		const data = Uint8Array.from([0xde, 0xad, 0xbe, 0xef]);
		expect(
			encodeCredentialData(UserCredentialType.Password, data),
		).toStrictEqual(Bytes.from(data));
	});
});

describe("normalizeCredentialData", () => {
	test("decodes UTF-16BE passwords", () => {
		expect(
			normalizeCredentialData(
				UserCredentialType.Password,
				Bytes.from([0x00, 0x61, 0x00, 0x62, 0x00, 0x63]),
			),
		).toBe("abc");
	});

	test("round-trips passwords through encode and normalize", () => {
		const password = "Front door 42!";
		expect(
			normalizeCredentialData(
				UserCredentialType.Password,
				encodeCredentialData(UserCredentialType.Password, password),
			),
		).toBe(password);
	});

	test("decodes PIN codes as single-byte text", () => {
		expect(
			normalizeCredentialData(
				UserCredentialType.PINCode,
				Bytes.from("1234", "ascii"),
			),
		).toBe("1234");
	});
});
