import {
	CommandClass,
	IndicatorCC,
	IndicatorCCGet,
	IndicatorCCReport,
	IndicatorCCSet,
	IndicatorCommand,
} from "@zwave-js/cc";
import { IndicatorCCValues } from "@zwave-js/cc/IndicatorCC";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";
import { createTestNode } from "../mocks";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Indicator, // CC
		]),
		payload,
	]);
}

const host = createTestingHost();

test("the Get command (V1) should serialize correctly", (t) => {
	const cc = new IndicatorCCGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Get command (V2) should serialize correctly", (t) => {
	const cc = new IndicatorCCGet(host, {
		nodeId: 1,
		indicatorId: 5,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Get, // CC Command
			5,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (v1) should serialize correctly", (t) => {
	const cc = new IndicatorCCSet(host, {
		nodeId: 2,
		value: 23,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Set, // CC Command
			23, // value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command (v2) should serialize correctly", (t) => {
	const cc = new IndicatorCCSet(host, {
		nodeId: 2,
		values: [
			{
				indicatorId: 1,
				propertyId: 2,
				value: 3,
			},
			{
				indicatorId: 5,
				propertyId: 3,
				value: 1,
			},
		],
	});
	const expected = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Set, // CC Command
			0,
			2, // object count
			1, // indicatorId
			2, // propertyId
			3, // value
			5, // indicatorId
			3, // propertyId
			1, // value
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Report, // CC Command
			55, // value
		]),
	);
	const cc = new IndicatorCCReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.indicator0Value, 55);
	t.is(cc.values, undefined);
});

test("the Report command (v2) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			IndicatorCommand.Report, // CC Command
			0,
			2, // object count
			1, // indicatorId
			2, // propertyId
			3, // value
			5, // indicatorId
			3, // propertyId
			1, // value
		]),
	);
	const cc = new IndicatorCCReport(host, {
		nodeId: 1,
		data: ccData,
	});
	// Boolean indicators are only interpreted during persistValues
	cc.persistValues(host);

	t.is(cc.indicator0Value, undefined);
	t.deepEqual(cc.values, [
		{
			indicatorId: 1,
			propertyId: 2,
			value: true, // this is a binary indicator
		},
		{
			indicatorId: 5,
			propertyId: 3,
			value: 1,
		},
	]);
});

test("deserializing an unsupported command should return an unspecified version of IndicatorCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new IndicatorCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, IndicatorCC);
});

test("the value IDs should be translated properly", (t) => {
	const valueId = IndicatorCCValues.valueV2(0x43, 2).endpoint(2);
	const testNode = createTestNode(host, { id: 2 });
	const ccInstance = CommandClass.createInstanceUnchecked(
		host,
		testNode,
		CommandClasses.Indicator,
	)!;
	const translatedProperty = ccInstance.translateProperty(
		host,
		valueId.property,
		valueId.propertyKey,
	);
	const translatedPropertyKey = ccInstance.translatePropertyKey(
		host,
		valueId.property,
		valueId.propertyKey,
	);
	t.is(translatedProperty, "Button 1 indication");
	t.is(translatedPropertyKey, "Binary");
});

// describe.skip("interviewing the node", () => {
// 	beforeAll(() => {
// 		(host.sendCommand as sinon.SinonStub)
// 			// getSupported
// 			.mockResolvedValueOnce({
// 				// (0x00)
// 				supportedProperties: [],
// 				indicatorId: 0x30,
// 				nextIndicatorId: 0x46,
// 			})
// 			.mockResolvedValueOnce({
// 				// (0x46)
// 				supportedProperties: [2, 3, 4],
// 				nextIndicatorId: 0x47,
// 			})
// 			.mockResolvedValueOnce({
// 				// (0x47)
// 				supportedProperties: [2, 3, 4],
// 				nextIndicatorId: 0x00,
// 			})
// 			// get
// 			.mockResolvedValueOnce([
// 				{
// 					indicatorId: 0x30,
// 					propertyId: 0x02,
// 					value: 0xff,
// 				},
// 			])
// 			.mockResolvedValueOnce([
// 				{
// 					indicatorId: 0x46,
// 					propertyId: 0x02,
// 					value: 0xff,
// 				},
// 			])
// 			.mockResolvedValueOnce([
// 				{
// 					indicatorId: 0x47,
// 					propertyId: 0x02,
// 					value: 0xff,
// 				},
// 			]);
// 	});

// 	test("should return all supported indicator IDs", async (t) => {
// 		const ccInstance = node1.createCCInstance(CommandClasses.Indicator)!;
// 		await ccInstance.interview(host);

// 		const indicatorIds = [0x30, 0x46, 0x47];
// 		t.deepEqual(node1.getValue(getSupportedIndicatorIDsValueID(0)),
// 			indicatorIds,
// 		);
// 		// We cannot test the contents of the value ID because we don't really parse the CCs
// 	});
// });

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.Indicator,
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
// 		CommandClasses.Indicator,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
