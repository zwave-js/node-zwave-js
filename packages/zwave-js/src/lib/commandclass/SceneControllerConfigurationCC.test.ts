import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost, TestingHost } from "@zwave-js/host";
import { createTestNode } from "../test/mocks";
import { getGroupCountValueId } from "./AssociationCC";
import {
	SceneControllerConfigurationCC,
	SceneControllerConfigurationCCGet,
	SceneControllerConfigurationCCReport,
	SceneControllerConfigurationCCSet,
} from "./SceneControllerConfigurationCC";
import { SceneControllerConfigurationCommand } from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Controller Configuration"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/SceneControllerConfigurationCC => ", () => {
	const fakeGroupCount = 5;
	const groupCountValueId = getGroupCountValueId();
	let host: TestingHost;

	beforeAll(() => {
		host = createTestingHost();
		const node2 = createTestNode(host, { id: 2 });
		host.nodes.set(2, node2);
		host.getValueDB(2).setValue(groupCountValueId, fakeGroupCount);
	});

	it("the Get command should serialize correctly", () => {
		const cc = new SceneControllerConfigurationCCGet(host, {
			nodeId: 2,
			groupId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneControllerConfigurationCommand.Get, // CC Command
				0b0000_0001,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Get command should throw if GroupId > groupCount", () => {
		expect(() => {
			new SceneControllerConfigurationCCGet(host, {
				nodeId: 2,
				groupId: fakeGroupCount + 1,
			});
		}).toThrow();
	});

	it("the Set command should serialize correctly", () => {
		const cc = new SceneControllerConfigurationCCSet(host, {
			nodeId: 2,
			groupId: 3,
			sceneId: 240,
			dimmingDuration: Duration.parseSet(0x05)!,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneControllerConfigurationCommand.Set, // CC Command
				3, // groupId
				240, // sceneId
				0x05, // dimming duration
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly with undefined duration", () => {
		const cc = new SceneControllerConfigurationCCSet(host, {
			nodeId: 2,
			groupId: 3,
			sceneId: 240,
			dimmingDuration: undefined,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneControllerConfigurationCommand.Set, // CC Command
				3, // groupId
				240, // sceneId
				0xff, // dimming duration
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should throw if GroupId > groupCount", () => {
		expect(
			() =>
				new SceneControllerConfigurationCCSet(host, {
					nodeId: 2,
					groupId: fakeGroupCount + 1,
					sceneId: 240,
					dimmingDuration: Duration.parseSet(0x05)!,
				}),
		).toThrow();
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				SceneControllerConfigurationCommand.Report, // CC Command
				3, // groupId
				240, // sceneId
				0x05, // dimming duration
			]),
		);
		const cc = new SceneControllerConfigurationCCReport(host, {
			nodeId: 2,
			data: ccData,
		});

		expect(cc.groupId).toBe(3);
		expect(cc.sceneId).toBe(240);
		expect(cc.dimmingDuration).toStrictEqual(Duration.parseReport(0x05)!);
	});

	it("deserializing an unsupported command should return an unspecified version of SceneControllerConfigurationCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new SceneControllerConfigurationCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(SceneControllerConfigurationCC);
	});
});
