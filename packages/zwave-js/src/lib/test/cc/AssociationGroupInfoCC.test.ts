import {
	AssociationGroupInfoCC,
	AssociationGroupInfoCCCommandListGet,
	AssociationGroupInfoCCCommandListReport,
	AssociationGroupInfoCCInfoGet,
	AssociationGroupInfoCCInfoReport,
	AssociationGroupInfoCCNameGet,
	AssociationGroupInfoCCNameReport,
	AssociationGroupInfoCommand,
	AssociationGroupInfoProfile,
	BasicCommand,
	CommandClass,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Association Group Information"], // CC
		]),
		payload,
	]);
}

test("the NameGet command should serialize correctly", async (t) => {
	const cc = new AssociationGroupInfoCCNameGet({
		nodeId: 1,
		groupId: 7,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.NameGet, // CC Command
			7, // group id
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the NameReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.NameReport, // CC Command
			7, // group id
			6, // name length
			// "foobar"
			0x66,
			0x6f,
			0x6f,
			0x62,
			0x61,
			0x72,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as AssociationGroupInfoCCNameReport;
	t.expect(cc.constructor).toBe(AssociationGroupInfoCCNameReport);

	t.expect(cc.groupId).toBe(7);
	t.expect(cc.name).toBe("foobar");
});

test("the InfoGet command should serialize correctly (no flag set)", async (t) => {
	const cc = new AssociationGroupInfoCCInfoGet({
		nodeId: 1,
		groupId: 7,
		listMode: false,
		refreshCache: false,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0, // flags
			7, // group id
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the InfoGet command should serialize correctly (refresh cache flag set)", async (t) => {
	const cc = new AssociationGroupInfoCCInfoGet({
		nodeId: 1,
		groupId: 7,
		listMode: false,
		refreshCache: true,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0b1000_0000, // flags
			7, // group id
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the InfoGet command should serialize correctly (list mode flag set)", async (t) => {
	const cc = new AssociationGroupInfoCCInfoGet({
		nodeId: 1,
		groupId: 7,
		listMode: true,
		refreshCache: false,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0b0100_0000, // flags
			0, // group id is ignored
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Info Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.InfoReport, // CC Command
			0b1100_0000 | 2, // Flags | group count
			1, // group id
			0, // mode
			// profile (lifeline)
			0,
			1,
			// reserved and event
			0,
			0,
			0,
			// ---
			2, // group id
			0, // mode
			// profile (Control key 1)
			0x20,
			1,
			// reserved and event
			0,
			0,
			0,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as AssociationGroupInfoCCInfoReport;
	t.expect(cc.constructor).toBe(AssociationGroupInfoCCInfoReport);

	t.expect(cc.groups.length).toBe(2);
	t.expect(cc.groups[0].groupId).toBe(1);
	t.expect(
		cc.groups[0].profile,
	).toBe(AssociationGroupInfoProfile["General: Lifeline"]);
	t.expect(cc.groups[1].groupId).toBe(2);
	t.expect(cc.groups[1].profile).toBe(
		AssociationGroupInfoProfile["Control: Key 01"],
	);
});

test("the CommandListGet command should serialize correctly", async (t) => {
	const cc = new AssociationGroupInfoCCCommandListGet({
		nodeId: 1,
		groupId: 6,
		allowCache: true,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.CommandListGet, // CC Command
			0b1000_0000, // allow cache
			6, // group id
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the CommandListReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			AssociationGroupInfoCommand.CommandListReport, // CC Command
			7, // group id
			5, // list length in bytes
			CommandClasses.Basic,
			BasicCommand.Set,
			// Security Mark (doesn't make sense but is an extended CC id)
			0xf1,
			0x00,
			0x05,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as AssociationGroupInfoCCCommandListReport;
	t.expect(cc.constructor).toBe(AssociationGroupInfoCCCommandListReport);

	t.expect(cc.groupId).toBe(7);
	t.expect(cc.commands.size).toBe(2);
	t.expect(
		[...cc.commands.keys()],
	).toStrictEqual([CommandClasses.Basic, CommandClasses["Security Mark"]]);
	t.expect([...cc.commands.values()]).toStrictEqual([[BasicCommand.Set], [
		0x05,
	]]);
});

test("deserializing an unsupported command should return an unspecified version of AssociationGroupInfoCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as AssociationGroupInfoCC;
	t.expect(cc.constructor).toBe(AssociationGroupInfoCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.AssociationGroupInfo,
// 		"currentValue",
// 	);
// 	t.like(currentValueMeta, {
// 		readable: true,
// 		writeable: false,
// 		min: 0,
// 		max: 99,
// 	});

// 	// Writeable, 0-99
// 	const targetValueMeta = getCCValueMetadata(
// 		CommandClasses.AssociationGroupInfo,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
