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
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Association Group Information"], // CC
		]),
		payload,
	]);
}

test("the NameGet command should serialize correctly", (t) => {
	const cc = new AssociationGroupInfoCCNameGet(host, {
		nodeId: 1,
		groupId: 7,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationGroupInfoCommand.NameGet, // CC Command
			7, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the NameReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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
	const cc = new AssociationGroupInfoCCNameReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.groupId, 7);
	t.is(cc.name, "foobar");
});

test("the InfoGet command should serialize correctly (no flag set)", (t) => {
	const cc = new AssociationGroupInfoCCInfoGet(host, {
		nodeId: 1,
		groupId: 7,
		listMode: false,
		refreshCache: false,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0, // flags
			7, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the InfoGet command should serialize correctly (refresh cache flag set)", (t) => {
	const cc = new AssociationGroupInfoCCInfoGet(host, {
		nodeId: 1,
		groupId: 7,
		listMode: false,
		refreshCache: true,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0b1000_0000, // flags
			7, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the InfoGet command should serialize correctly (list mode flag set)", (t) => {
	const cc = new AssociationGroupInfoCCInfoGet(host, {
		nodeId: 1,
		groupId: 7,
		listMode: true,
		refreshCache: false,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationGroupInfoCommand.InfoGet, // CC Command
			0b0100_0000, // flags
			0, // group id is ignored
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Info Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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
	const cc = new AssociationGroupInfoCCInfoReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.groups.length, 2);
	t.is(cc.groups[0].groupId, 1);
	t.is(
		cc.groups[0].profile,
		AssociationGroupInfoProfile["General: Lifeline"],
	);
	t.is(cc.groups[1].groupId, 2);
	t.is(cc.groups[1].profile, AssociationGroupInfoProfile["Control: Key 01"]);
});

test("the CommandListGet command should serialize correctly", (t) => {
	const cc = new AssociationGroupInfoCCCommandListGet(host, {
		nodeId: 1,
		groupId: 6,
		allowCache: true,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationGroupInfoCommand.CommandListGet, // CC Command
			0b1000_0000, // allow cache
			6, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the CommandListReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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
	const cc = new AssociationGroupInfoCCCommandListReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.groupId, 7);
	t.is(cc.commands.size, 2);
	t.deepEqual(
		[...cc.commands.keys()],
		[CommandClasses.Basic, CommandClasses["Security Mark"]],
	);
	t.deepEqual([...cc.commands.values()], [[BasicCommand.Set], [0x05]]);
});

test("deserializing an unsupported command should return an unspecified version of AssociationGroupInfoCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new AssociationGroupInfoCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, AssociationGroupInfoCC);
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
