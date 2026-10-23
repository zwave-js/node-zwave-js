import crypto from "node:crypto";

import { Bytes } from "@zwave-js/shared";
import { test } from "vitest";

import { ZWaveErrorCodes } from "../error/ZWaveError.js";
import { assertZWaveError } from "../test/assertZWaveError.js";

import { extractFirmware } from "./firmware.js";

const hex = ":0400000001020304F2\n:00000001FF\n";

test("extractFirmware() decrypts HEC files", async (t) => {
	// The key and IV used for HEC files
	const key = Bytes.from(
		"d7a68def0f4a1241940f6cb8017121d15f0e2682e258c9f7553e706e834923b7",
		"hex",
	);
	const iv = Bytes.from("0e6519297530583708612a2823663844", "hex");
	const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
	const ciphertext = Bytes.concat([
		cipher.update(Bytes.from(hex.replaceAll("\n", " "), "ascii")),
		cipher.final(),
	]);
	const hec = Bytes.concat([
		Bytes.from("HSENC2", "ascii"),
		Bytes.from(ciphertext.toString("base64"), "ascii"),
	]);

	const { data } = await extractFirmware(hec, "hec");
	t.expect(data).toStrictEqual(Bytes.from([1, 2, 3, 4]));
});

test("extractFirmware() throws a ZWaveError for invalid HEX files", async (t) => {
	for (const invalid of [
		// Wrong checksum
		":0400000001020304F3\n:00000001FF\n",
		// No EOF record
		":0400000001020304F2\n",
		// Data after the EOF record
		hex + ":0400000001020304F2\n",
	]) {
		await assertZWaveError(
			t.expect,
			() => extractFirmware(Bytes.from(invalid, "ascii"), "hex"),
			{ errorCode: ZWaveErrorCodes.Argument_Invalid },
		);
	}
});
