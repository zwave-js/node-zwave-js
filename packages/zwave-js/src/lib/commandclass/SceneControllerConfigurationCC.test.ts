import { CommandClasses, Duration } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import { getGroupCountValueId } from "./AssociationCC";
import {
	SceneControllerConfigurationCC,
	SceneControllerConfigurationCCGet,
	SceneControllerConfigurationCCReport,
	SceneControllerConfigurationCCSet,
	SceneControllerConfigurationCommand,
} from "./SceneControllerConfigurationCC";

const fakeGroupCount = 5;
const groupCountValueId = getGroupCountValueId();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Controller Configuration"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/SceneControllerConfigurationCC => ", () => {
	let fakeDriver: Driver;
	let node2: ZWaveNode;

	beforeAll(() => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;

		node2 = new ZWaveNode(2, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(2, node2);
		node2.addCC(CommandClasses["Scene Controller Configuration"], {
			isSupported: true,
			version: 1,
		});
		node2.addCC(CommandClasses.Association, {
			isSupported: true,
			version: 3,
		});
		node2.valueDB.setValue(groupCountValueId, fakeGroupCount);
	});

	afterAll(() => {
		node2.destroy();
	});

	it("the Get command should serialize correctly", () => {
		const cc = new SceneControllerConfigurationCCGet(fakeDriver, {
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
			new SceneControllerConfigurationCCGet(fakeDriver, {
				nodeId: 2,
				groupId: fakeGroupCount + 1,
			});
		}).toThrow();
	});

	it("the Set command should serialize correctly", () => {
		const cc = new SceneControllerConfigurationCCSet(fakeDriver, {
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
		const cc = new SceneControllerConfigurationCCSet(fakeDriver, {
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
				new SceneControllerConfigurationCCSet(fakeDriver, {
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
		const cc = new SceneControllerConfigurationCCReport(fakeDriver, {
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
		const cc: any = new SceneControllerConfigurationCC(fakeDriver, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(SceneControllerConfigurationCC);
	});
});
