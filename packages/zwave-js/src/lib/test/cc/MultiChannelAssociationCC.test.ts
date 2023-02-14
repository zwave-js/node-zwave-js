import {
	MultiChannelAssociationCCGet,
	MultiChannelAssociationCCRemove,
	MultiChannelAssociationCCReport,
	MultiChannelAssociationCCSet,
	MultiChannelAssociationCCSupportedGroupingsGet,
	MultiChannelAssociationCCSupportedGroupingsReport,
	MultiChannelAssociationCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multi Channel Association"], // CC
		]),
		payload,
	]);
}

test("the SupportedGroupingsGet command should serialize correctly", (t) => {
	const cc = new MultiChannelAssociationCCSupportedGroupingsGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.SupportedGroupingsGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedGroupingsReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.SupportedGroupingsReport, // CC Command
			7, // # of groups
		]),
	);
	const cc = new MultiChannelAssociationCCSupportedGroupingsReport(host, {
		nodeId: 4,
		data: ccData,
	});

	t.is(cc.groupCount, 7);
});

test("the Set command should serialize correctly (node IDs only)", (t) => {
	const cc = new MultiChannelAssociationCCSet(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Set, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly (endpoint addresses only)", (t) => {
	const cc = new MultiChannelAssociationCCSet(host, {
		nodeId: 2,
		groupId: 5,
		endpoints: [
			{
				nodeId: 5,
				endpoint: 1,
			},
			{
				nodeId: 7,
				endpoint: [1, 2, 3, 5, 7],
			},
		],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Set, // CC Command
			5, // group id
			0, // Endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly (both options)", (t) => {
	const cc = new MultiChannelAssociationCCSet(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 3],
		endpoints: [
			{
				nodeId: 5,
				endpoint: 1,
			},
			{
				nodeId: 7,
				endpoint: [1, 2, 3, 5, 7],
			},
		],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Set, // CC Command
			5, // group id
			// Node IDs:
			1,
			2,
			3,
			0, // Endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Get command should serialize correctly", (t) => {
	const cc = new MultiChannelAssociationCCGet(host, {
		nodeId: 1,
		groupId: 9,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Get, // CC Command
			9, // group ID
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly (node IDs only)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Report, // CC Command
			5, // group id
			9, // max nodes
			0, // reports to follow
			// Node IDs
			1,
			2,
			5,
		]),
	);
	const cc = new MultiChannelAssociationCCReport(host, {
		nodeId: 4,
		data: ccData,
	});

	t.is(cc.groupId, 5);
	t.is(cc.maxNodes, 9);
	t.is(cc.reportsToFollow, 0);
	t.deepEqual(cc.nodeIds, [1, 2, 5]);
	t.deepEqual(cc.endpoints, []);
});

test("the Report command should be deserialized correctly (endpoint addresses only)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Report, // CC Command
			5, // group id
			9, // max nodes
			0, // reports to follow
			0, // endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	const cc = new MultiChannelAssociationCCReport(host, {
		nodeId: 4,
		data: ccData,
	});

	t.deepEqual(cc.nodeIds, []);
	t.deepEqual(cc.endpoints, [
		{
			nodeId: 5,
			endpoint: 1,
		},
		{
			nodeId: 7,
			endpoint: [1, 2, 3, 5, 7],
		},
	]);
});

test("the Report command should be deserialized correctly (both options)", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Report, // CC Command
			5, // group id
			9, // max nodes
			0, // reports to follow
			1,
			5,
			9,
			0, // endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	const cc = new MultiChannelAssociationCCReport(host, {
		nodeId: 4,
		data: ccData,
	});

	t.deepEqual(cc.nodeIds, [1, 5, 9]);
	t.deepEqual(cc.endpoints, [
		{
			nodeId: 5,
			endpoint: 1,
		},
		{
			nodeId: 7,
			endpoint: [1, 2, 3, 5, 7],
		},
	]);
});

test("the Remove command should serialize correctly (node IDs only)", (t) => {
	const cc = new MultiChannelAssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 5],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Remove, // CC Command
			5, // group id
			// Node IDs
			1,
			2,
			5,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Remove command should serialize correctly (endpoint addresses only)", (t) => {
	const cc = new MultiChannelAssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
		endpoints: [
			{
				nodeId: 5,
				endpoint: 1,
			},
			{
				nodeId: 7,
				endpoint: [1, 2, 3, 5, 7],
			},
		],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Remove, // CC Command
			5, // group id
			0, // Endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Remove command should serialize correctly (both options)", (t) => {
	const cc = new MultiChannelAssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
		nodeIds: [1, 2, 3],
		endpoints: [
			{
				nodeId: 5,
				endpoint: 1,
			},
			{
				nodeId: 7,
				endpoint: [1, 2, 3, 5, 7],
			},
		],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Remove, // CC Command
			5, // group id
			// Node IDs:
			1,
			2,
			3,
			0, // Endpoint marker
			// Address 1:
			5,
			1,
			// Address 2:
			7,
			0b11010111,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Remove command should serialize correctly (both empty)", (t) => {
	const cc = new MultiChannelAssociationCCRemove(host, {
		nodeId: 2,
		groupId: 5,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			MultiChannelAssociationCommand.Remove, // CC Command
			5, // group id
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

// test("deserializing an unsupported command should return an unspecified version of MultiChannelAssociationCC", (t) => {
// 	const serializedCC = buildCCBuffer(
// 		1,
// 		Buffer.from([255]), // not a valid command
// 	);
// 	const cc: any = new MultiChannelAssociationCC(host, {
// 		data: serializedCC,
// 	});
// 	t.is(cc.constructor, MultiChannelAssociationCC);
// });

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.MultiChannelAssociation,
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
// 		CommandClasses.MultiChannelAssociation,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
