import {
	SceneControllerConfigurationCC,
	SceneControllerConfigurationCCGet,
	SceneControllerConfigurationCCReport,
	SceneControllerConfigurationCCSet,
	SceneControllerConfigurationCommand,
} from "@zwave-js/cc";
import { AssociationCCValues } from "@zwave-js/cc/AssociationCC";
import { CommandClasses, Duration, type IZWaveNode } from "@zwave-js/core";
import { createTestingHost, type TestingHost } from "@zwave-js/host";
import test from "ava";
import { createTestNode } from "../mocks";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Scene Controller Configuration"], // CC
		]),
		payload,
	]);
}

const fakeGroupCount = 5;
const groupCountValueId = AssociationCCValues.groupCount.id;

function prepareTest(): { host: TestingHost; node2: IZWaveNode } {
	const host = createTestingHost();
	const node2 = createTestNode(host, { id: 2 });
	host.nodes.set(2, node2);
	host.getValueDB(2).setValue(groupCountValueId, fakeGroupCount);

	return { host, node2 };
}

test("the Get command should serialize correctly", (t) => {
	const { host } = prepareTest();
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
	t.deepEqual(cc.serialize(), expected);
});

test.skip("the Get command should throw if GroupId > groupCount", (t) => {
	const { host } = prepareTest();
	// TODO: This check now lives on the CC API
	t.notThrows(() => {
		new SceneControllerConfigurationCCGet(host, {
			nodeId: 2,
			groupId: fakeGroupCount + 1,
		});
	});
});

test("the Set command should serialize correctly", (t) => {
	const { host } = prepareTest();
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
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly with undefined duration", (t) => {
	const { host } = prepareTest();
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
	t.deepEqual(cc.serialize(), expected);
});

test.skip("the Set command should throw if GroupId > groupCount", (t) => {
	const { host } = prepareTest();
	// TODO: This check now lives on the CC API
	t.notThrows(
		() =>
			new SceneControllerConfigurationCCSet(host, {
				nodeId: 2,
				groupId: fakeGroupCount + 1,
				sceneId: 240,
				dimmingDuration: Duration.parseSet(0x05)!,
			}),
	);
});

test("the Report command (v1) should be deserialized correctly", (t) => {
	const { host } = prepareTest();
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

	t.is(cc.groupId, 3);
	t.is(cc.sceneId, 240);
	t.deepEqual(cc.dimmingDuration, Duration.parseReport(0x05)!);
});

test("deserializing an unsupported command should return an unspecified version of SceneControllerConfigurationCC", (t) => {
	const { host } = prepareTest();
	const serializedCC = buildCCBuffer(
		Buffer.from([255]), // not a valid command
	);
	const cc: any = new SceneControllerConfigurationCC(host, {
		nodeId: 1,
		data: serializedCC,
	});
	t.is(cc.constructor, SceneControllerConfigurationCC);
});
