import { createEmptyMockDriver } from "../../../test/mocks";
import type { Driver } from "../driver/Driver";
import { AssociationCCGet, AssociationCCRemove, AssociationCCReport, AssociationCCSet, AssociationCCSupportedGroupingsGet, AssociationCCSupportedGroupingsReport, AssociationCommand } from "./AssociationCC";
import { CommandClasses } from "./CommandClasses";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

function buildCCBuffer(nodeId: number, payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			nodeId, // node number
			payload.length + 1, // remaining length
			CommandClasses.Association, // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/AssociationCC => ", () => {
	it("the SupportedGroupingsGet command should serialize correctly", () => {
		const cc = new AssociationCCSupportedGroupingsGet(fakeDriver, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			1,
			Buffer.from([
				AssociationCommand.SupportedGroupingsGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedGroupingsReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			1,
			Buffer.from([
				AssociationCommand.SupportedGroupingsReport, // CC Command
				7, // # of groups
			]),
		);
		const cc = new AssociationCCSupportedGroupingsReport(fakeDriver, {
			data: ccData,
		});

		expect(cc.groupCount).toBe(7);
	});

	it("the Set command should serialize correctly", () => {
		const cc = new AssociationCCSet(fakeDriver, {
			nodeId: 2,
			groupId: 5,
			nodeIds: [1, 2, 5],
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				AssociationCommand.Set, // CC Command
				5, // group id
				// Node IDs
				1,
				2,
				5,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});
	it("the Get command should serialize correctly", () => {
		const cc = new AssociationCCGet(fakeDriver, {
			nodeId: 1,
			groupId: 9,
		});
		const expected = buildCCBuffer(
			1,
			Buffer.from([
				AssociationCommand.Get, // CC Command
				9, // group ID
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			2,
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
		const cc = new AssociationCCReport(fakeDriver, {
			data: ccData,
		});

		expect(cc.groupId).toBe(5);
		expect(cc.maxNodes).toBe(9);
		expect(cc.reportsToFollow).toBe(0);
		expect(cc.nodeIds).toEqual([1, 2, 5]);
	});

	it("the Remove command should serialize correctly", () => {
		const cc = new AssociationCCRemove(fakeDriver, {
			nodeId: 2,
			groupId: 5,
			nodeIds: [1, 2, 5],
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				AssociationCommand.Remove, // CC Command
				5, // group id
				// Node IDs
				1,
				2,
				5,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Remove command should serialize correctly (empty node list)", () => {
		const cc = new AssociationCCRemove(fakeDriver, {
			nodeId: 2,
			groupId: 5,
		});
		const expected = buildCCBuffer(
			2,
			Buffer.from([
				AssociationCommand.Remove, // CC Command
				5, // group id
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	// it("deserializing an unsupported command should return an unspecified version of AssociationCC", () => {
	// 	const serializedCC = buildCCBuffer(
	// 		1,
	// 		Buffer.from([255]), // not a valid command
	// 	);
	// 	const cc: any = new AssociationCC(fakeDriver, {
	// 		data: serializedCC,
	// 	});
	// 	expect(cc.constructor).toBe(AssociationCC);
	// });

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.Association,
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
	// 		CommandClasses.Association,
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
