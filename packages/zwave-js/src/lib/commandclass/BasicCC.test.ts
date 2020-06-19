import { CommandClasses } from "@zwave-js/core";
import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import {
	BasicCC,
	BasicCCGet,
	BasicCCReport,
	BasicCCSet,
	BasicCommand,
} from "./BasicCC";
import { getCCValueMetadata } from "./CommandClass";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses.Basic, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/BasicCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const basicCC = new BasicCCGet(fakeDriver, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				BasicCommand.Get, // CC Command
			]),
		);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const basicCC = new BasicCCSet(fakeDriver, {
			nodeId: 2,
			targetValue: 55,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				BasicCommand.Set, // CC Command
				55, // target value
			]),
		);
		expect(basicCC.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BasicCommand.Report, // CC Command
				55, // current value
			]),
		);
		const basicCC = new BasicCCReport(fakeDriver, {
			nodeId: 2,
			data: ccData,
		});

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBeUndefined();
		expect(basicCC.duration).toBeUndefined();
	});

	it("the Report command (v2) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				BasicCommand.Report, // CC Command
				55, // current value
				66, // target value
				1, // duration
			]),
		);
		const basicCC = new BasicCCReport(fakeDriver, {
			nodeId: 2,
			data: ccData,
		});

		expect(basicCC.currentValue).toBe(55);
		expect(basicCC.targetValue).toBe(66);
		expect(basicCC.duration!.unit).toBe("seconds");
		expect(basicCC.duration!.value).toBe(1);
	});

	it("deserializing an unsupported command should return an unspecified version of BasicCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const basicCC: any = new BasicCC(fakeDriver, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BasicCC);
	});

	it("the CC values should have the correct metadata", () => {
		// Readonly, 0-99
		const currentValueMeta = getCCValueMetadata(
			CommandClasses.Basic,
			"currentValue",
		);
		expect(currentValueMeta).toMatchObject({
			readable: true,
			writeable: false,
			min: 0,
			max: 99,
		});

		// Writeable, 0-99
		const targetValueMeta = getCCValueMetadata(
			CommandClasses.Basic,
			"targetValue",
		);
		expect(targetValueMeta).toMatchObject({
			readable: true,
			writeable: true,
			min: 0,
			max: 99,
		});
	});

	describe("getDefinedValueIDs()", () => {
		it("should include the target value for all endpoints except the node itself", () => {
			// Repro for GH#377
			const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
			(fakeDriver as any).controller.nodes.set(node.id, node);
			// interviewComplete needs to be true for getEndpoint to work
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "interviewComplete",
				},
				true,
			);
			// We have 2 endpoints
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "individualCount",
				},
				2,
			);
			// And we only support V1, so no report of the target value
			for (let ep = 0; ep <= 2; ep++) {
				node.getEndpoint(ep)!.addCC(CommandClasses.Basic, {
					isSupported: true,
					version: 1,
				});
			}

			const valueIDs = node
				.getDefinedValueIDs()
				.filter(
					({ commandClass, property }) =>
						commandClass === CommandClasses.Basic &&
						property === "targetValue",
				);
			const endpoints = valueIDs.map(({ endpoint }) => endpoint);

			expect(endpoints).toEqual([1, 2]);
		});
	});
});
