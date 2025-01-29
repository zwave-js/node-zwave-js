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
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import * as nodeUtils from "../../node/utils.js";
import { type CreateTestNodeOptions, createTestNode } from "../mocks.js";

const host = createTestingHost();

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Basic, // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const basicCC = new BasicCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			BasicCommand.Get, // CC Command
		]),
	);
	await t.expect(basicCC.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Get command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BasicCommand.Get, // CC Command
		]),
	);
	const basicCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCGet;
	t.expect(basicCC.constructor).toBe(BasicCCGet);
	t.expect(basicCC.nodeId).toBe(2);
});

test("the Set command should serialize correctly", async (t) => {
	const basicCC = new BasicCCSet({
		nodeId: 2,
		targetValue: 55,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			BasicCommand.Set, // CC Command
			55, // target value
		]),
	);
	await t.expect(basicCC.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BasicCommand.Report, // CC Command
			55, // current value
		]),
	);
	const basicCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.expect(basicCC.constructor).toBe(BasicCCReport);

	t.expect(basicCC.currentValue).toBe(55);
	t.expect(basicCC.targetValue).toBeUndefined();
	t.expect(basicCC.duration).toBeUndefined();
});

test("the Report command (v2) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			BasicCommand.Report, // CC Command
			55, // current value
			66, // target value
			1, // duration
		]),
	);
	const basicCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.expect(basicCC.constructor).toBe(BasicCCReport);

	t.expect(basicCC.currentValue).toBe(55);
	t.expect(basicCC.targetValue).toBe(66);
	t.expect(basicCC.duration!.unit).toBe("seconds");
	t.expect(basicCC.duration!.value).toBe(1);
});

test("deserializing an unsupported command should return an unspecified version of BasicCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const basicCC = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 2 } as any,
	) as BasicCCReport;
	t.expect(basicCC.constructor).toBe(BasicCC);
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
	t.expect(endpointIndizes).toStrictEqual([1, 2]);
});

test("BasicCCSet should expect no response", (t) => {
	const cc = new BasicCCSet({
		nodeId: 2,
		endpointIndex: 2,
		targetValue: 7,
	});
	t.expect(cc.expectsCCResponse()).toBe(false);
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

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(false);
});

test("BasicCCGet should expect a response", (t) => {
	const cc = new BasicCCGet({
		nodeId: 2,
	});
	t.expect(cc.expectsCCResponse()).toBe(true);
});

test("BasicCCGet => BasicCCReport = expected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport({
		nodeId: ccRequest.nodeId,
		currentValue: 7,
	});

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(true);
});

test("BasicCCGet => BasicCCReport (wrong node) = unexpected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport({
		nodeId: (ccRequest.nodeId as number) + 1,
		currentValue: 7,
	});

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(false);
});

test("BasicCCGet => BasicCCSet = unexpected", (t) => {
	const ccRequest = new BasicCCGet({
		nodeId: 2,
	});
	const ccResponse = new BasicCCSet({
		nodeId: ccRequest.nodeId,
		targetValue: 7,
	});

	t.expect(ccRequest.isExpectedCCResponse(ccResponse)).toBe(false);
});

test("Looking up CC values for a CC instance should work", (t) => {
	const cc = new BasicCCGet({
		nodeId: 2,
	});
	const values = getCCValues(cc) as typeof BasicCCValues;
	t.expect(values.currentValue.id).toMatchObject({
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	});
});
