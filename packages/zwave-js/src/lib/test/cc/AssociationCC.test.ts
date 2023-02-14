import {
	AssociationCCGet,
	AssociationCCRemove,
	AssociationCCReport,
	AssociationCCSet,
	AssociationCCSupportedGroupingsGet,
	AssociationCCSupportedGroupingsReport,
	AssociationCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Association, // CC
		]),
		payload,
	]);
}

test("the SupportedGroupingsGet command should serialize correctly", (t) => {
	const cc = new AssociationCCSupportedGroupingsGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationCommand.SupportedGroupingsGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedGroupingsReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			AssociationCommand.SupportedGroupingsReport, // CC Command
			7, // # of groups
		]),
	);
	const cc = new AssociationCCSupportedGroupingsReport(host, {
		nodeId: 2,
		data: ccData,
	});

	t.is(cc.groupCount, 7);
});

test("the Set command should serialize correctly", (t) => {
	const cc = new AssociationCCSet(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationCommand.Set, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});
test("the Get command should serialize correctly", (t) => {
	const cc = new AssociationCCGet(host, {
		nodeId: 1,
		groupId: 9,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationCommand.Get, // CC Command
			9, // group ID
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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
	const cc = new AssociationCCReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.groupId, 5);
	t.is(cc.maxNodes, 9);
	t.is(cc.reportsToFollow, 0);
	t.deepEqual(cc.nodeIds, [1, 2, 5]);
});

test("the Remove command should serialize correctly", (t) => {
	const cc = new AssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationCommand.Remove, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Remove command should serialize correctly (empty node list)", (t) => {
	const cc = new AssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			AssociationCommand.Remove, // CC Command
			5, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

// test("deserializing an unsupported command should return an unspecified version of AssociationCC", (t) => {
// 	const serializedCC = buildCCBuffer(
// 		1,
// 		Buffer.from([255]), // not a valid command
// 	);
// 	const cc: any = new AssociationCC(host, {
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
