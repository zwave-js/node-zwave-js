import { CommandClasses, Duration } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import {
	SceneActuatorConfigurationCC,
	SceneActuatorConfigurationCCGet,
	SceneActuatorConfigurationCCReport,
	SceneActuatorConfigurationCCSet,
	SceneActuatorConfigurationCommand,
} from "./SceneActuatorConfigurationCC";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Actuator Configuration"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/SceneActuatorConfigurationCC => ", () => {
	let fakeDriver: Driver;
	let node2: ZWaveNode;

	beforeAll(() => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;

		node2 = new ZWaveNode(2, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(2, node2);
		node2.addCC(CommandClasses["Scene Actuator Configuration"], {
			isSupported: true,
			version: 1,
		});
	});

	afterAll(() => {
		node2.destroy();
	});
	it("the Get command should serialize correctly", () => {
		const cc = new SceneActuatorConfigurationCCGet(fakeDriver, {
			nodeId: 2,
			sceneId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Get, // CC Command
				1,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly with level", () => {
		const cc = new SceneActuatorConfigurationCCSet(fakeDriver, {
			nodeId: 2,
			sceneId: 2,
			level: 0x00,
			dimmingDuration: Duration.parseSet(0x05)!,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Set, // CC Command
				2,
				0x05, // dimmingDuration
				0b1000_0000, // override
				0x00, // level
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly with undefined level", () => {
		const cc = new SceneActuatorConfigurationCCSet(fakeDriver, {
			nodeId: 2,
			sceneId: 2,
			//level: undefined,
			dimmingDuration: Duration.parseSet(0x05)!,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Set, // CC Command
				2, // nodeId
				0x05, // dimmingDuration
				0b0000_0000, // override
				0xff, // level
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command (v1) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Report, // CC Command
				55, // sceneId
				0x50, // level
				0x05, // dimmingDuration
			]),
		);
		const cc = new SceneActuatorConfigurationCCReport(fakeDriver, {
			nodeId: 2,
			data: ccData,
		});

		expect(cc.sceneId).toBe(55);
		expect(cc.level).toBe(0x50);
		expect(cc.dimmingDuration).toStrictEqual(Duration.parseReport(0x05)!);
	});

	it("deserializing an unsupported command should return an unspecified version of SceneActuatorConfigurationCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new SceneActuatorConfigurationCC(fakeDriver, {
			nodeId: 2,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(SceneActuatorConfigurationCC);
	});
});
