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
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";
import { createTestNode } from "../mocks.js";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses.Indicator, // CC
		]),
		payload,
	]);
}

const host = createTestingHost();

test("the Get command (V1) should serialize correctly", async (t) => {
	const cc = new IndicatorCCGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			IndicatorCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Get command (V2) should serialize correctly", async (t) => {
	const cc = new IndicatorCCGet({
		nodeId: 1,
		indicatorId: 5,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			IndicatorCommand.Get, // CC Command
			5,
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command (v1) should serialize correctly", async (t) => {
	const cc = new IndicatorCCSet({
		nodeId: 2,
		value: 23,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			IndicatorCommand.Set, // CC Command
			23, // value
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command (v2) should serialize correctly", async (t) => {
	const cc = new IndicatorCCSet({
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
		Uint8Array.from([
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
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			IndicatorCommand.Report, // CC Command
			55, // value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as IndicatorCCReport;
	t.expect(cc.constructor).toBe(IndicatorCCReport);

	t.expect(cc.indicator0Value).toBe(55);
	t.expect(cc.values).toBeUndefined();
});

test("the Report command (v2) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as IndicatorCCReport;
	t.expect(cc.constructor).toBe(IndicatorCCReport);
	// Boolean indicators are only interpreted during persistValues
	cc.persistValues(host);

	t.expect(cc.indicator0Value).toBeUndefined();
	t.expect(cc.values).toStrictEqual([
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

test("deserializing an unsupported command should return an unspecified version of IndicatorCC", async (t) => {
	const serializedCC = buildCCBuffer(
		Uint8Array.from([255]), // not a valid command
	);
	const cc = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 1 } as any,
	) as IndicatorCC;
	t.expect(cc.constructor).toBe(IndicatorCC);
});

test("the value IDs should be translated properly", (t) => {
	const valueId = IndicatorCCValues.valueV2(0x43, 2).endpoint(2);
	const testNode = createTestNode(host, { id: 2 });
	const ccInstance = CommandClass.createInstanceUnchecked(
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
	t.expect(translatedProperty).toBe("Button 1 indication");
	t.expect(translatedPropertyKey).toBe("Binary");
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
