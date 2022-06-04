import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	MultiChannelAssociationCCGet,
	MultiChannelAssociationCCRemove,
	MultiChannelAssociationCCReport,
	MultiChannelAssociationCCSet,
	MultiChannelAssociationCCSupportedGroupingsGet,
	MultiChannelAssociationCCSupportedGroupingsReport,
} from "./MultiChannelAssociationCC";
import { MultiChannelAssociationCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Multi Channel Association"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/MultiChannelAssociationCC => ", () => {
	it("the SupportedGroupingsGet command should serialize correctly", () => {
		const cc = new MultiChannelAssociationCCSupportedGroupingsGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				MultiChannelAssociationCommand.SupportedGroupingsGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedGroupingsReport command should be deserialized correctly", () => {
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

		expect(cc.groupCount).toBe(7);
	});

	it("the Set command should serialize correctly (node IDs only)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (endpoint addresses only)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly (both options)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly (node IDs only)", () => {
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

		expect(cc.groupId).toBe(5);
		expect(cc.maxNodes).toBe(9);
		expect(cc.reportsToFollow).toBe(0);
		expect(cc.nodeIds).toEqual([1, 2, 5]);
		expect(cc.endpoints).toEqual([]);
	});

	it("the Report command should be deserialized correctly (endpoint addresses only)", () => {
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

		expect(cc.nodeIds).toEqual([]);
		expect(cc.endpoints).toEqual([
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

	it("the Report command should be deserialized correctly (both options)", () => {
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

		expect(cc.nodeIds).toEqual([1, 5, 9]);
		expect(cc.endpoints).toEqual([
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

	it("the Remove command should serialize correctly (node IDs only)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Remove command should serialize correctly (endpoint addresses only)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Remove command should serialize correctly (both options)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Remove command should serialize correctly (both empty)", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	// it("deserializing an unsupported command should return an unspecified version of MultiChannelAssociationCC", () => {
	// 	const serializedCC = buildCCBuffer(
	// 		1,
	// 		Buffer.from([255]), // not a valid command
	// 	);
	// 	const cc: any = new MultiChannelAssociationCC(host, {
	// 		data: serializedCC,
	// 	});
	// 	expect(cc.constructor).toBe(MultiChannelAssociationCC);
	// });

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.MultiChannelAssociation,
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
	// 		CommandClasses.MultiChannelAssociation,
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
