import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { createTestNode, TestingHost } from "../test/mocks";
import { CommandClass } from "./CommandClass";
import {
	getIndicatorValueValueID,
	getSupportedIndicatorIDsValueID,
	IndicatorCC,
	IndicatorCCGet,
	IndicatorCCReport,
	IndicatorCCSet,
} from "./IndicatorCC";
import { IndicatorCommand } from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Indicator, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/IndicatorCC => ", () => {
	let host: TestingHost;
	// let host: Driver;
	// let node1: ZWaveNode;

	beforeAll(
		async () => {
			host = createTestingHost();
			await host.configManager.loadIndicators();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	// afterAll(() => {
	// 	node1.destroy();
	// });

	it("the Get command (V1) should serialize correctly", () => {
		const cc = new IndicatorCCGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				IndicatorCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command (V2) should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (v1) should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command (v2) should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
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

		expect(cc.value).toBe(55);
		expect(cc.values).toBeUndefined();
	});

	it("the Report command (v2) should be deserialized correctly", () => {
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

		expect(cc.value).toBe(undefined);
		expect(cc.values).toEqual([
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

	it("deserializing an unsupported command should return an unspecified version of IndicatorCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new IndicatorCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(IndicatorCC);
	});

	it("the value IDs should be translated properly", () => {
		const valueId = getIndicatorValueValueID(2, 0x43, 2);
		const testNode = createTestNode(host, { id: 2 });
		const ccInstance = CommandClass.createInstanceUnchecked(
			host,
			testNode,
			CommandClasses.Indicator,
		)!;
		const translatedProperty = ccInstance.translateProperty(
			valueId.property,
			valueId.propertyKey,
		);
		const translatedPropertyKey = ccInstance.translatePropertyKey(
			valueId.property,
			valueId.propertyKey!,
		);
		expect(translatedProperty).toBe("Button 1 indication");
		expect(translatedPropertyKey).toBe("Binary");
	});

	describe.skip("interviewing the node", () => {
		beforeAll(() => {
			(host.sendCommand as jest.Mock)
				// getSupported
				.mockResolvedValueOnce({
					// (0x00)
					supportedProperties: [],
					indicatorId: 0x30,
					nextIndicatorId: 0x46,
				})
				.mockResolvedValueOnce({
					// (0x46)
					supportedProperties: [2, 3, 4],
					nextIndicatorId: 0x47,
				})
				.mockResolvedValueOnce({
					// (0x47)
					supportedProperties: [2, 3, 4],
					nextIndicatorId: 0x00,
				})
				// get
				.mockResolvedValueOnce([
					{
						indicatorId: 0x30,
						propertyId: 0x02,
						value: 0xff,
					},
				])
				.mockResolvedValueOnce([
					{
						indicatorId: 0x46,
						propertyId: 0x02,
						value: 0xff,
					},
				])
				.mockResolvedValueOnce([
					{
						indicatorId: 0x47,
						propertyId: 0x02,
						value: 0xff,
					},
				]);
		});

		it("should return all supported indicator IDs", async () => {
			const ccInstance = node1.createCCInstance(
				CommandClasses.Indicator,
			)!;
			await ccInstance.interview(host);

			const indicatorIds = [0x30, 0x46, 0x47];
			expect(node1.getValue(getSupportedIndicatorIDsValueID(0))).toEqual(
				indicatorIds,
			);
			// We cannot test the contents of the value ID because we don't really parse the CCs
		});
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Indicator,
	// 		"currentValue",
	// 	);
	// 	expect(currentValueMeta).toMatchObject({
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
	// 	expect(targetValueMeta).toMatchObject({
	// 		readable: true,
	// 		writeable: true,
	// 		min: 0,
	// 		max: 99,
	// 	});
	// });
});
