import {
	CommandClass,
	EntryControlCCConfigurationGet,
	EntryControlCCConfigurationReport,
	EntryControlCCConfigurationSet,
	EntryControlCCEventSupportedGet,
	EntryControlCCEventSupportedReport,
	EntryControlCCKeySupportedGet,
	EntryControlCCKeySupportedReport,
	EntryControlCCNotification,
	EntryControlCommand,
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Entry Control"], // CC
		]),
		payload,
	]);
}

test("the Notification command should deserialize correctly", async (t) => {
	const data = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				EntryControlCommand.Notification, // CC Command
				0x1,
				0x2,
				0x3,
				16,
				49,
				50,
				51,
				52,
			]),
			// Required padding for ASCII
			new Uint8Array(12).fill(0xff),
		]),
	);

	const cc = await CommandClass.parse(
		data,
		{ sourceNodeId: 1 } as any,
	) as EntryControlCCNotification;
	t.expect(cc.constructor).toBe(EntryControlCCNotification);

	t.expect(cc.sequenceNumber).toStrictEqual(1);
	t.expect(cc.dataType).toStrictEqual(EntryControlDataTypes.ASCII);
	t.expect(cc.eventType).toStrictEqual(EntryControlEventTypes.DisarmAll);
	t.expect(cc.eventData).toStrictEqual("1234");
});

test("the ConfigurationGet command should serialize correctly", async (t) => {
	const cc = new EntryControlCCConfigurationGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.ConfigurationGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the ConfigurationSet command should serialize correctly", async (t) => {
	const cc = new EntryControlCCConfigurationSet({
		nodeId: 1,
		keyCacheSize: 1,
		keyCacheTimeout: 2,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.ConfigurationSet, // CC Command
			0x1,
			0x2,
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the ConfigurationReport command should be deserialize correctly", async (t) => {
	const data = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.ConfigurationReport, // CC Command
			0x1,
			0x2,
		]),
	);

	const cc = await CommandClass.parse(
		data,
		{ sourceNodeId: 1 } as any,
	) as EntryControlCCConfigurationReport;
	t.expect(cc.constructor).toBe(EntryControlCCConfigurationReport);

	t.expect(cc.keyCacheSize).toStrictEqual(1);
	t.expect(cc.keyCacheTimeout).toStrictEqual(2);
});

test("the EventSupportedGet command should serialize correctly", async (t) => {
	const cc = new EntryControlCCEventSupportedGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.EventSupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the EventSupportedReport command should be deserialize correctly", async (t) => {
	const data = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.EventSupportedReport, // CC Command
			1,
			0b00000100,
			4,
			0b01101000,
			0b00000000,
			0b00000000,
			0b00000010,
			1,
			20,
			2,
			9,
		]),
	);

	const cc = await CommandClass.parse(
		data,
		{ sourceNodeId: 1 } as any,
	) as EntryControlCCEventSupportedReport;
	t.expect(cc.constructor).toBe(EntryControlCCEventSupportedReport);

	t.expect(cc.supportedDataTypes).toStrictEqual([
		EntryControlDataTypes.ASCII,
	]);
	t.expect(cc.supportedEventTypes).toStrictEqual([
		EntryControlEventTypes.DisarmAll,
		EntryControlEventTypes.ArmAway,
		EntryControlEventTypes.ArmHome,
		EntryControlEventTypes.Cancel,
	]);
	t.expect(cc.minKeyCacheSize).toStrictEqual(1);
	t.expect(cc.maxKeyCacheSize).toStrictEqual(20);
	t.expect(cc.minKeyCacheTimeout).toStrictEqual(2);
	t.expect(cc.maxKeyCacheTimeout).toStrictEqual(9);
});

test("the KeySupportedGet command should serialize correctly", async (t) => {
	const cc = new EntryControlCCKeySupportedGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.KeySupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the KeySupportedReport command should be deserialize correctly", async (t) => {
	const data = buildCCBuffer(
		Uint8Array.from([
			EntryControlCommand.KeySupportedReport, // CC Command
			1,
			0b01011010,
		]),
	);

	const cc = await CommandClass.parse(
		data,
		{ sourceNodeId: 1 } as any,
	) as EntryControlCCKeySupportedReport;
	t.expect(cc.constructor).toBe(EntryControlCCKeySupportedReport);

	t.expect(cc.supportedKeys).toStrictEqual([1, 3, 4, 6]);
});
