import {
	CommandClass,
	InvalidCC,
	UserCredentialCCCredentialReport,
	UserCredentialCCCredentialSet,
	UserCredentialCCUserReport,
	UserCredentialCCUserSet,
	UserCredentialCommand,
	UserCredentialCredentialReportType,
	UserCredentialModifierType,
	UserCredentialNameEncoding,
	UserCredentialOperationType,
	UserCredentialRule,
	UserCredentialType,
	UserCredentialUserReportType,
	UserCredentialUserType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";
import { test } from "vitest";

function buildCCBuffer(payload: BytesView): BytesView {
	return Bytes.concat([
		Uint8Array.from([CommandClasses["User Credential"]]),
		payload,
	]);
}

function parse(payload: number[]): Promise<CommandClass> {
	return CommandClass.parse(buildCCBuffer(Uint8Array.from(payload)), {
		sourceNodeId: 2,
	} as any);
}

// "ab" in UTF-16BE, and the same with its last byte cut off
const UTF16_AB = [0x00, 0x61, 0x00, 0x62];
const UTF16_ODD = [0x00, 0x61, 0x00];

function userSet(name: number[]): number[] {
	return [
		UserCredentialCommand.UserSet,
		UserCredentialOperationType.Add,
		0x00,
		0x01, // user ID
		UserCredentialUserType.General,
		0x01, // active
		UserCredentialRule.Single,
		0x00,
		0x00, // expiring timeout
		UserCredentialNameEncoding.UTF16BE,
		name.length,
		...name,
	];
}

function userReport(name: number[]): number[] {
	return [
		UserCredentialCommand.UserReport,
		UserCredentialUserReportType.ResponseToGet,
		0x00,
		0x00, // next user ID
		UserCredentialModifierType.ZWave,
		0x00,
		0x01, // modifier node ID
		0x00,
		0x01, // user ID
		UserCredentialUserType.General,
		0x01, // active
		UserCredentialRule.Single,
		0x00,
		0x00, // expiring timeout
		UserCredentialNameEncoding.UTF16BE,
		name.length,
		...name,
	];
}

function credentialSet(data: number[]): number[] {
	return [
		UserCredentialCommand.CredentialSet,
		0x00,
		0x01, // user ID
		UserCredentialType.Password,
		0x00,
		0x01, // credential slot
		UserCredentialOperationType.Add,
		data.length,
		...data,
	];
}

function credentialReport(data: number[], readBack = true): number[] {
	return [
		UserCredentialCommand.CredentialReport,
		UserCredentialCredentialReportType.ResponseToGet,
		0x00,
		0x01, // user ID
		UserCredentialType.Password,
		0x00,
		0x01, // credential slot
		readBack ? 0b1000_0000 : 0x00,
		data.length,
		...data,
		UserCredentialModifierType.ZWave,
		0x00,
		0x01, // modifier node ID
		UserCredentialType.None,
		0x00,
		0x00, // next credential slot
	];
}

test("a UTF-16 user name in a User Set is decoded", async (t) => {
	const cc = await parse(userSet(UTF16_AB));
	t.expect(cc).toBeInstanceOf(UserCredentialCCUserSet);
	t.expect((cc as UserCredentialCCUserSet).userName).toBe("ab");
});

test("a User Set with an odd-length UTF-16 user name is invalid", async (t) => {
	t.expect(await parse(userSet(UTF16_ODD))).toBeInstanceOf(InvalidCC);
});

test("a UTF-16 user name in a User Report is decoded", async (t) => {
	const cc = await parse(userReport(UTF16_AB));
	t.expect(cc).toBeInstanceOf(UserCredentialCCUserReport);
	t.expect((cc as UserCredentialCCUserReport).userName).toBe("ab");
});

test("a User Report with an odd-length UTF-16 user name is invalid", async (t) => {
	t.expect(await parse(userReport(UTF16_ODD))).toBeInstanceOf(InvalidCC);
});

test("a password in a Credential Set is kept as received", async (t) => {
	const cc = await parse(credentialSet(UTF16_AB));
	t.expect(cc).toBeInstanceOf(UserCredentialCCCredentialSet);
	t.expect(
		(cc as UserCredentialCCCredentialSet).credentialData,
	).toStrictEqual(Bytes.from(UTF16_AB));
});

test("a Credential Set with an odd-length password is invalid", async (t) => {
	t.expect(await parse(credentialSet(UTF16_ODD))).toBeInstanceOf(InvalidCC);
});

test("a password read back in a Credential Report is kept as received", async (t) => {
	const cc = await parse(credentialReport(UTF16_AB));
	t.expect(cc).toBeInstanceOf(UserCredentialCCCredentialReport);
	t.expect(
		(cc as UserCredentialCCCredentialReport).credentialData,
	).toStrictEqual(Bytes.from(UTF16_AB));
});

test("a Credential Report with an odd-length password is invalid", async (t) => {
	t.expect(await parse(credentialReport(UTF16_ODD))).toBeInstanceOf(
		InvalidCC,
	);
});

test("a Credential Report without read back does not check the password's length", async (t) => {
	const cc = await parse(credentialReport(UTF16_ODD, false));
	t.expect(cc).toBeInstanceOf(UserCredentialCCCredentialReport);
	t.expect((cc as UserCredentialCCCredentialReport).credentialReadBack).toBe(
		false,
	);
});
