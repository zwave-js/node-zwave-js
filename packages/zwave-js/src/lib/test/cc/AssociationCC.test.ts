import {
	AssociationCCGet,
	AssociationCCRemove,
	AssociationCCReport,
	AssociationCCSet,
	AssociationCCSupportedGroupingsGet,
	AssociationCCSupportedGroupingsReport,
	AssociationCommand,
	CommandClass,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Association, // CC
		]),
		payload,
	]);
}

test("the SupportedGroupingsGet command should serialize correctly", async (t) => {
	const cc = new AssociationCCSupportedGroupingsGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.SupportedGroupingsGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the SupportedGroupingsReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.SupportedGroupingsReport, // CC Command
			7, // # of groups
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as AssociationCCSupportedGroupingsReport;
	t.expect(cc.constructor).toBe(AssociationCCSupportedGroupingsReport);

	t.expect(cc.groupCount).toBe(7);
});

test("the Set command should serialize correctly", async (t) => {
	const cc = new AssociationCCSet({
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.Set, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});
test("the Get command should serialize correctly", async (t) => {
	const cc = new AssociationCCGet({
		nodeId: 1,
		groupId: 9,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.Get, // CC Command
			9, // group ID
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.Report, // CC Command
			5, // group id
			9, // max nodes
			0, // reports to follow
			// Node IDs
			1,
			2,
			5,
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as AssociationCCReport;
	t.expect(cc.constructor).toBe(AssociationCCReport);

	t.expect(cc.groupId).toBe(5);
	t.expect(cc.maxNodes).toBe(9);
	t.expect(cc.reportsToFollow).toBe(0);
	t.expect(cc.nodeIds).toStrictEqual([1, 2, 5]);
});

test("the Remove command should serialize correctly", async (t) => {
	const cc = new AssociationCCRemove({
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.Remove, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Remove command should serialize correctly (empty node list)", async (t) => {
	const cc = new AssociationCCRemove({
		nodeId: 2,
		groupId: 5,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			AssociationCommand.Remove, // CC Command
			5, // group id
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

// test("deserializing an unsupported command should return an unspecified version of AssociationCC", (t) => {
// 	const serializedCC = buildCCBuffer(
// 		1,
// 		Uint8Array.from([255]), // not a valid command
// 	);
// 	const cc: any = new AssociationCC({
// 		data: serializedCC,
// 	});
// 	t.is(cc.constructor, AssociationCC);
// });

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.Association,
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
// 		CommandClasses.Association,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
