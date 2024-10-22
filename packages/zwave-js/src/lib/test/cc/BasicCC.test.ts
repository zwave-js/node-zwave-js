import {
	BasicCC,
	BasicCCGet,
	BasicCCReport,
	BasicCCSet,
	type BasicCCValues,
	BasicCommand,
	CommandClass,
	getCCValues,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import * as nodeUtils from "../../node/utils";
import { type CreateTestNodeOptions, createTestNode } from "../mocks";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Basic, // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const basicCC = new BasicCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			BasicCommand.Get, // CC Command
		]),
	);
	t.deepEqual(basicCC.serialize({} as any), expected);
});

test("the Get command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BasicCommand.Get, // CC Command
		]),
	);
	const basicCC = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCGet;
	t.is(basicCC.constructor, BasicCCGet);
	t.is(basicCC.nodeId, 2);
});

test("the Set command should serialize correctly", (t) => {
	const basicCC = new BasicCCSet({
		nodeId: 2,
		targetValue: 55,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			BasicCommand.Set, // CC Command
			55, // target value
		]),
	);
	t.deepEqual(basicCC.serialize({} as any), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BasicCommand.Report, // CC Command
			55, // current value
		]),
	);
	const basicCC = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.is(basicCC.constructor, BasicCCReport);

	t.is(basicCC.currentValue, 55);
	t.is(basicCC.targetValue, undefined);
	t.is(basicCC.duration, undefined);
});

test("the Report command (v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BasicCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]),
	);
	const basicCC = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.is(basicCC.constructor, BasicCCReport);

	t.is(basicCC.currentValue, 55);
	t.is(basicCC.targetValue, 66);
	t.is(basicCC.duration!.unit, "seconds");
	t.is(basicCC.duration!.value, 1);
});

test("deserializing an unsupported command should return an unspecified version of BasicCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const basicCC = CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.is(basicCC.constructor, BasicCC);
});

test("getDefinedValueIDs() should include the target value for all endpoints except the node itself", (t) => {
	// Repro for GH#377
	const commandClasses: CreateTestNodeOptions["commandClasses"] = {
		[CommandClasses.Basic]: {
			version: 1,
		},
		[CommandClasses["Multi Channel"]]: {
			version: 2,
		},
	};
	const node2 = createTestNode(host, {
		id: 2,
		commandClasses,
		endpoints: {
			1: { commandClasses },
			2: { commandClasses },
		},
	});
	host.setNode(node2.id, node2);

	const valueIDs = nodeUtils
		.getDefinedValueIDs(host as any, node2)
		.filter(
			({ commandClass, property }) =>
				commandClass === CommandClasses.Basic
				&& property === "targetValue",
		);
	const endpointIndizes = valueIDs.map(({ endpoint }) => endpoint);
	t.deepEqual(endpointIndizes, [1, 2]);
});

test("BasicCCSet should expect no response", (t) => {
	const cc = new BasicCCSet({
		nodeId: 2,
		endpointIndex: 2,
		targetValue: 7,
	});
	t.false(cc.expectsCCResponse());
});

test("BasicCCSet => BasicCCReport = unexpected", (t) => {
	const ccRequest = new BasicCCSet({
		nodeId: 2,
		endpointIndex: 2,
		targetValue: 7,
	});
	const ccResponse = new BasicCCReport({
		nodeId: ccRequest.nodeId,
		currentValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet should expect a response", (t) => {
	const cc = new BasicCCGet({
		nodeId: 2,
	});
	t.true(cc.expectsCCResponse());
});

test("BasicCCGet => BasicCCReport = expected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport({
		nodeId: ccRequest.nodeId,
		currentValue: 7,
	});

	t.true(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet => BasicCCReport (wrong node) = unexpected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport({
		nodeId: (ccRequest.nodeId as number) + 1,
		currentValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet => BasicCCSet = unexpected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCSet({
		nodeId: ccRequest.nodeId,
		targetValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("Looking up CC values for a CC instance should work", (t) => {
	const cc = new BasicCCGet({
		nodeId: 2,
	});
	const values = getCCValues(cc) as typeof BasicCCValues;
	t.like(values.currentValue.id, {
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	});
});
