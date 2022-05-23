import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	CentralSceneCC,
	CentralSceneCCConfigurationGet,
	CentralSceneCCConfigurationReport,
	CentralSceneCCConfigurationSet,
	CentralSceneCCNotification,
	CentralSceneCCSupportedGet,
	CentralSceneCCSupportedReport,
} from "./CentralSceneCC";
import { CentralSceneCommand, CentralSceneKeys } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Central Scene"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/CentralSceneCC => ", () => {
	it("the ConfigurationGet command should serialize correctly", () => {
		const cc = new CentralSceneCCConfigurationGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.ConfigurationGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command should serialize correctly (flags set)", () => {
		const cc = new CentralSceneCCConfigurationSet(host, {
			nodeId: 2,
			slowRefresh: true,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.ConfigurationSet, // CC Command
				0b1000_0000,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command should serialize correctly (flags not set)", () => {
		const cc = new CentralSceneCCConfigurationSet(host, {
			nodeId: 2,
			slowRefresh: false,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.ConfigurationSet, // CC Command
				0,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.ConfigurationReport, // CC Command
				0b1000_0000,
			]),
		);
		const cc = new CentralSceneCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.slowRefresh).toBe(true);
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new CentralSceneCCSupportedGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.SupportedReport, // CC Command
				2, // # of scenes
				0b1_0000_10_0, // slow refresh, 2 bytes per scene, not identical
				0b1, // scene 1, key 1
				0b11, // scene 1, keys 9, 10
				0b10101, // scene 2, keys 1,3,5
				0,
			]),
		);
		const cc = new CentralSceneCCSupportedReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.sceneCount).toBe(2);
		expect(cc.supportsSlowRefresh).toBeTrue();
		expect(cc.supportedKeyAttributes.size).toBe(2);
		// Key attributes start counting at 0
		expect(cc.supportedKeyAttributes.get(1)).toEqual([0, 8, 9]);
		expect(cc.supportedKeyAttributes.get(2)).toEqual([0, 2, 4]);
	});

	it("the Notification command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.Notification, // CC Command
				7, // sequence number
				0b1000_0000 | CentralSceneKeys.KeyPressed4x, // slow refresh
				8, // scene number
			]),
		);
		const cc = new CentralSceneCCNotification(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.sequenceNumber).toBe(7);
		// slow refresh is only evaluated if the attribute is KeyHeldDown
		expect(cc.slowRefresh).toBeFalsy();
		expect(cc.keyAttribute).toBe(CentralSceneKeys.KeyPressed4x);
		expect(cc.sceneNumber).toBe(8);
	});

	it("the Notification command should be deserialized correctly (KeyHeldDown)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				CentralSceneCommand.Notification, // CC Command
				7, // sequence number
				0b1000_0000 | CentralSceneKeys.KeyHeldDown, // slow refresh
				8, // scene number
			]),
		);
		const cc = new CentralSceneCCNotification(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.sequenceNumber).toBe(7);
		expect(cc.slowRefresh).toBeTrue();
		expect(cc.keyAttribute).toBe(CentralSceneKeys.KeyHeldDown);
		expect(cc.sceneNumber).toBe(8);
	});

	it("deserializing an unsupported command should return an unspecified version of CentralSceneCC", () => {
		const serializedCC = buildCCBuffer(
			Buffer.from([255]), // not a valid command
		);
		const cc: any = new CentralSceneCC(host, {
			nodeId: 1,
			data: serializedCC,
		});
		expect(cc.constructor).toBe(CentralSceneCC);
	});

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.CentralScene,
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
	// 		CommandClasses.CentralScene,
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
