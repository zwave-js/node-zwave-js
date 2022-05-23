import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	AssociationGroupInfoCC,
	AssociationGroupInfoCCCommandListGet,
	AssociationGroupInfoCCCommandListReport,
	AssociationGroupInfoCCInfoGet,
	AssociationGroupInfoCCInfoReport,
	AssociationGroupInfoCCNameGet,
	AssociationGroupInfoCCNameReport,
} from "./AssociationGroupInfoCC";
import {
	AssociationGroupInfoCommand,
	AssociationGroupInfoProfile,
	BasicCommand,
} from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Association Group Information"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/AssociationGroupInfoCC => ", () => {
	it("the NameGet command should serialize correctly", () => {
		const cc = new AssociationGroupInfoCCNameGet(host, {
			nodeId: 1,
			groupId: 7,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.NameGet, // CC Command
				7, // group id
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the NameReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.NameReport, // CC Command
				7, // group id
				6, // name length
				// "foobar"
				0x66,
				0x6f,
				0x6f,
				0x62,
				0x61,
				0x72,
			]),
		);
		const cc = new AssociationGroupInfoCCNameReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.groupId).toBe(7);
		expect(cc.name).toBe("foobar");
	});

	it("the InfoGet command should serialize correctly (no flag set)", () => {
		const cc = new AssociationGroupInfoCCInfoGet(host, {
			nodeId: 1,
			groupId: 7,
			listMode: false,
			refreshCache: false,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.InfoGet, // CC Command
				0, // flags
				7, // group id
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the InfoGet command should serialize correctly (refresh cache flag set)", () => {
		const cc = new AssociationGroupInfoCCInfoGet(host, {
			nodeId: 1,
			groupId: 7,
			listMode: false,
			refreshCache: true,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.InfoGet, // CC Command
				0b1000_0000, // flags
				7, // group id
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the InfoGet command should serialize correctly (list mode flag set)", () => {
		const cc = new AssociationGroupInfoCCInfoGet(host, {
			nodeId: 1,
			groupId: 7,
			listMode: true,
			refreshCache: false,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.InfoGet, // CC Command
				0b0100_0000, // flags
				0, // group id is ignored
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Info Report command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.InfoReport, // CC Command
				0b1100_0000 | 2, // Flags | group count
				1, // group id
				0, // mode
				// profile (lifeline)
				0,
				1,
				// reserved and event
				0,
				0,
				0,
				// ---
				2, // group id
				0, // mode
				// profile (Control key 1)
				0x20,
				1,
				// reserved and event
				0,
				0,
				0,
			]),
		);
		const cc = new AssociationGroupInfoCCInfoReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.groups).toHaveLength(2);
		expect(cc.groups[0].groupId).toBe(1);
		expect(cc.groups[0].profile).toBe(
			AssociationGroupInfoProfile["General: Lifeline"],
		);
		expect(cc.groups[1].groupId).toBe(2);
		expect(cc.groups[1].profile).toBe(
			AssociationGroupInfoProfile["Control: Key 01"],
		);
	});

	it("the CommandListGet command should serialize correctly", () => {
		const cc = new AssociationGroupInfoCCCommandListGet(host, {
			nodeId: 1,
			groupId: 6,
			allowCache: true,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.CommandListGet, // CC Command
				0b1000_0000, // allow cache
				6, // group id
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CommandListReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				AssociationGroupInfoCommand.CommandListReport, // CC Command
				7, // group id
				5, // list length in bytes
				CommandClasses.Basic,
				BasicCommand.Set,
				// Security Mark (doesn't make sense but is an extended CC id)
				0xf1,
				0x00,
				0x05,
			]),
		);
		const cc = new AssociationGroupInfoCCCommandListReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.groupId).toBe(7);
		expect(cc.commands.size).toBe(2);
		expect([...cc.commands.keys()]).toEqual([
			CommandClasses.Basic,
			CommandClasses["Security Mark"],
		]);
		expect([...cc.commands.values()]).toEqual([[BasicCommand.Set], [0x05]]);
	});

	it("deserializing an unsupported command should return an unspecified version of AssociationGroupInfoCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new AssociationGroupInfoCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(AssociationGroupInfoCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.AssociationGroupInfo,
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
	// 		CommandClasses.AssociationGroupInfo,
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
