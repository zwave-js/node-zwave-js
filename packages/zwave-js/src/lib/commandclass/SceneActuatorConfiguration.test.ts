import { CommandClasses, Duration } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { createEmptyMockDriver } from "../test/mocks";
import {
	SceneActuatorConfigurationCC,
	SceneActuatorConfigurationCCGet,
	SceneActuatorConfigurationCCReport,
	SceneActuatorConfigurationCCSet,
	SceneActuatorConfigurationCommand,
} from "./SceneActuatorConfigurationCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Actuator Configuration"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/SceneActuatorConfigurationCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new SceneActuatorConfigurationCCGet(fakeDriver, {
			nodeId: 1,
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
			level: 0x50,
			dimmingDuration: Duration.parseSet(0x05)!,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Set, // CC Command
				2,
				0x05, // dimmingDuration
				0b1000_0000,
				0x50, // level
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly with undefined level", () => {
		const cc = new SceneActuatorConfigurationCCSet(fakeDriver, {
			nodeId: 3,
			sceneId: 2,
			level: undefined,
			dimmingDuration: Duration.parseSet(0x05)!,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				SceneActuatorConfigurationCommand.Set, // CC Command
				2,
				0x05, // dimmingDuration
				0b0000_0000,
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
			nodeId: 4,
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
			nodeId: 5,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(SceneActuatorConfigurationCC);
	});
});
