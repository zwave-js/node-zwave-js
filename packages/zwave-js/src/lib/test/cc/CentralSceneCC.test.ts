import {
	CentralSceneCC,
	CentralSceneCCConfigurationGet,
	CentralSceneCCConfigurationReport,
	CentralSceneCCConfigurationSet,
	CentralSceneCCNotification,
	CentralSceneCCSupportedGet,
	CentralSceneCCSupportedReport,
	CentralSceneCommand,
	CentralSceneKeys,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Central Scene"], // CC
		]),
		payload,
	]);
}

test("the ConfigurationGet command should serialize correctly", (t) => {
	const cc = new CentralSceneCCConfigurationGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			CentralSceneCommand.ConfigurationGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the ConfigurationSet command should serialize correctly (flags set)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the ConfigurationSet command should serialize correctly (flags not set)", (t) => {
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
	t.deepEqual(cc.serialize(), expected);
});

test("the ConfigurationReport command should be deserialized correctly", (t) => {
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

	t.is(cc.slowRefresh, true);
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new CentralSceneCCSupportedGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			CentralSceneCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedReport command should be deserialized correctly", (t) => {
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

	t.is(cc.sceneCount, 2);
	t.true(cc.supportsSlowRefresh);
	t.is(cc.supportedKeyAttributes.size, 2);
	// Key attributes start counting at 0
	t.deepEqual(cc.supportedKeyAttributes.get(1), [0, 8, 9]);
	t.deepEqual(cc.supportedKeyAttributes.get(2), [0, 2, 4]);
});

test("the Notification command should be deserialized correctly", (t) => {
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

	t.is(cc.sequenceNumber, 7);
	// slow refresh is only evaluated if the attribute is KeyHeldDown
	t.falsy(cc.slowRefresh);
	t.is(cc.keyAttribute, CentralSceneKeys.KeyPressed4x);
	t.is(cc.sceneNumber, 8);
});

test("the Notification command should be deserialized correctly (KeyHeldDown)", (t) => {
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

	t.is(cc.sequenceNumber, 7);
	t.true(cc.slowRefresh);
	t.is(cc.keyAttribute, CentralSceneKeys.KeyHeldDown);
	t.is(cc.sceneNumber, 8);
});

test("deserializing an unsupported command should return an unspecified version of CentralSceneCC", (t) => {
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new CentralSceneCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, CentralSceneCC);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.CentralScene,
// 		"currentValue",
// 	);
// 	t.like(currentValueMeta, {
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
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
