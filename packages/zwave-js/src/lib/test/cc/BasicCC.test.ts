import {
	BasicCC,
	BasicCCGet,
	BasicCCReport,
	BasicCCSet,
	BasicCCValues,
	BasicCommand,
	getCCValues,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import * as nodeUtils from "../../node/utils";
import { createTestNode } from "../mocks";

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
	const basicCC = new BasicCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			BasicCommand.Get, // CC Command
		]),
	);
	t.deepEqual(basicCC.serialize(), expected);
});

test("the Set command should serialize correctly", (t) => {
	const basicCC = new BasicCCSet(host, {
		nodeId: 2,
		targetValue: 55,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			BasicCommand.Set, // CC Command
			55, // target value
		]),
	);
	t.deepEqual(basicCC.serialize(), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			BasicCommand.Report, // CC Command
			55, // current value
		]),
	);
	const basicCC = new BasicCCReport(host, {
		nodeId: 2,
		data: ccData,
	});

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
	const basicCC = new BasicCCReport(host, {
		nodeId: 2,
		data: ccData,
	});

	t.is(basicCC.currentValue, 55);
	t.is(basicCC.targetValue, 66);
	t.is(basicCC.duration!.unit, "seconds");
	t.is(basicCC.duration!.value, 1);
});

test("deserializing an unsupported command should return an unspecified version of BasicCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const basicCC: any = new BasicCC(host, {
		nodeId: 2,
		data: serializedCC,
	});
	t.is(basicCC.constructor, BasicCC);
});

test("getDefinedValueIDs() should include the target value for all endpoints except the node itself", (t) => {
	// Repro for GH#377
	const node2 = createTestNode(host, {
		id: 2,
		numEndpoints: 2,
		supportsCC(cc) {
			switch (cc) {
				case CommandClasses.Basic:
				case CommandClasses["Multi Channel"]:
					return true;
			}
			return false;
		},
		getCCVersion(cc) {
			switch (cc) {
				case CommandClasses.Basic:
					// We only support V1, so no report of the target value
					return 1;
				case CommandClasses["Multi Channel"]:
					return 2;
			}
			return 0;
		},
	});
	host.nodes.set(node2.id, node2);

	const valueIDs = nodeUtils
		.getDefinedValueIDs(host as any, node2)
		.filter(
			({ commandClass, property }) =>
				commandClass === CommandClasses.Basic &&
				property === "targetValue",
		);
	const endpointIndizes = valueIDs.map(({ endpoint }) => endpoint);
	t.deepEqual(endpointIndizes, [1, 2]);
});

test("BasicCCSet should expect no response", (t) => {
	const cc = new BasicCCSet(host, {
		nodeId: 2,
		endpoint: 2,
		targetValue: 7,
	});
	t.false(cc.expectsCCResponse());
});

test("BasicCCSet => BasicCCReport = unexpected", (t) => {
	const ccRequest = new BasicCCSet(host, {
		nodeId: 2,
		endpoint: 2,
		targetValue: 7,
	});
	const ccResponse = new BasicCCReport(host, {
		nodeId: ccRequest.nodeId,
		currentValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet should expect a response", (t) => {
	const cc = new BasicCCGet(host, {
		nodeId: 2,
	});
	t.true(cc.expectsCCResponse());
});

test("BasicCCGet => BasicCCReport = expected", (t) => {
	const ccRequest = new BasicCCGet(host, {
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport(host, {
		nodeId: ccRequest.nodeId,
		currentValue: 7,
	});

	t.true(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet => BasicCCReport (wrong node) = unexpected", (t) => {
	const ccRequest = new BasicCCGet(host, {
		nodeId: 2,
	});
	const ccResponse = new BasicCCReport(host, {
		nodeId: (ccRequest.nodeId as number) + 1,
		currentValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("BasicCCGet => BasicCCSet = unexpected", (t) => {
	const ccRequest = new BasicCCGet(host, {
		nodeId: 2,
	});
	const ccResponse = new BasicCCSet(host, {
		nodeId: ccRequest.nodeId,
		targetValue: 7,
	});

	t.false(ccRequest.isExpectedCCResponse(ccResponse));
});

test("Looking up CC values for a CC instance should work", (t) => {
	const cc = new BasicCCGet(host, {
		nodeId: 2,
	});
	const values = getCCValues(cc) as typeof BasicCCValues;
	t.like(values.currentValue.id, {
		commandClass: CommandClasses.Basic,
		property: "currentValue",
	});
});
