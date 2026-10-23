import {
	CommandClass,
	UserCredentialCCUserReport,
	UserCredentialCCUserSet,
	UserCredentialModifierType,
	UserCredentialNameEncoding,
	UserCredentialOperationType,
	UserCredentialRule,
	UserCredentialUserReportType,
	UserCredentialUserType,
} from "@zwave-js/cc";
import { ZWaveErrorCodes, assertZWaveError } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { test } from "vitest";

const extendedASCIIName = "José Müller";
const extendedASCIIBytes = Bytes.from([
	0x4a, 0x6f, 0x73, 0xe9, 0x20, 0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72,
]);

test("the UserSet command encodes and decodes Extended ASCII user names with one byte per character", async (t) => {
	const cc = new UserCredentialCCUserSet({
		nodeId: 2,
		operationType: UserCredentialOperationType.Add,
		userId: 1,
		userType: UserCredentialUserType.General,
		active: true,
		credentialRule: UserCredentialRule.Single,
		nameEncoding: UserCredentialNameEncoding.ExtendedASCII,
		userName: extendedASCIIName,
	});
	const serialized = await cc.serialize({} as any);
	// CC, command and 10 bytes before the name
	t.expect(serialized[11]).toBe(extendedASCIIBytes.length);
	t.expect(serialized.subarray(12)).toStrictEqual(extendedASCIIBytes);

	const parsed = (await CommandClass.parse(serialized, {
		sourceNodeId: 1,
	} as any)) as UserCredentialCCUserSet;
	t.expect(parsed.userName).toBe(extendedASCIIName);
});

test("the UserReport command encodes and decodes Extended ASCII user names with one byte per character", async (t) => {
	const cc = new UserCredentialCCUserReport({
		nodeId: 2,
		reportType: UserCredentialUserReportType.UserAdded,
		modifierType: UserCredentialModifierType.ZWave,
		modifierNodeId: 1,
		userId: 1,
		userType: UserCredentialUserType.General,
		active: true,
		credentialRule: UserCredentialRule.Single,
		expiringTimeoutMinutes: 0,
		nameEncoding: UserCredentialNameEncoding.ExtendedASCII,
		userName: extendedASCIIName,
	});
	const serialized = await cc.serialize({} as any);
	t.expect(serialized.subarray(-extendedASCIIBytes.length)).toStrictEqual(
		extendedASCIIBytes,
	);

	const parsed = (await CommandClass.parse(serialized, {
		sourceNodeId: 2,
	} as any)) as UserCredentialCCUserReport;
	t.expect(parsed.userName).toBe(extendedASCIIName);
});

test("the UserSet command refuses to encode characters outside of Extended ASCII", async (t) => {
	const cc = new UserCredentialCCUserSet({
		nodeId: 2,
		operationType: UserCredentialOperationType.Add,
		userId: 1,
		userType: UserCredentialUserType.General,
		active: true,
		credentialRule: UserCredentialRule.Single,
		nameEncoding: UserCredentialNameEncoding.ExtendedASCII,
		userName: "日本",
	});
	await assertZWaveError(t.expect, () => cc.serialize({} as any), {
		errorCode: ZWaveErrorCodes.Argument_Invalid,
	});
});
