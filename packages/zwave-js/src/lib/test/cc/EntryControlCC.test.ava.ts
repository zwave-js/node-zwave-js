import {
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
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Entry Control"], // CC
		]),
		payload,
	]);
}

test("the Notification command should deserialize correctly", (t) => {
	const data = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
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
			Buffer.alloc(12, 0xff),
		]),
	);

	const cc = new EntryControlCCNotification(host, {
		nodeId: 1,
		data,
	});

	t.deepEqual(cc.sequenceNumber, 1);
	t.deepEqual(cc.dataType, EntryControlDataTypes.ASCII);
	t.deepEqual(cc.eventType, EntryControlEventTypes.DisarmAll);
	t.deepEqual(cc.eventData, "1234");
});

test("the ConfigurationGet command should serialize correctly", (t) => {
	const cc = new EntryControlCCConfigurationGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.ConfigurationGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the ConfigurationSet command should serialize correctly", (t) => {
	const cc = new EntryControlCCConfigurationSet(host, {
		nodeId: 1,
		keyCacheSize: 1,
		keyCacheTimeout: 2,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.ConfigurationSet, // CC Command
			0x1,
			0x2,
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the ConfigurationReport command should be deserialize correctly", (t) => {
	const data = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.ConfigurationReport, // CC Command
			0x1,
			0x2,
		]),
	);

	const cc = new EntryControlCCConfigurationReport(host, {
		nodeId: 1,
		data,
	});

	t.deepEqual(cc.keyCacheSize, 1);
	t.deepEqual(cc.keyCacheTimeout, 2);
});

test("the EventSupportedGet command should serialize correctly", (t) => {
	const cc = new EntryControlCCEventSupportedGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.EventSupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the EventSupportedReport command should be deserialize correctly", (t) => {
	const data = buildCCBuffer(
		Buffer.from([
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

	const cc = new EntryControlCCEventSupportedReport(host, {
		nodeId: 1,
		data,
	});

	t.deepEqual(cc.supportedDataTypes, [EntryControlDataTypes.ASCII]);
	t.deepEqual(cc.supportedEventTypes, [
		EntryControlEventTypes.DisarmAll,
		EntryControlEventTypes.ArmAway,
		EntryControlEventTypes.ArmHome,
		EntryControlEventTypes.Cancel,
	]);
	t.deepEqual(cc.minKeyCacheSize, 1);
	t.deepEqual(cc.maxKeyCacheSize, 20);
	t.deepEqual(cc.minKeyCacheTimeout, 2);
	t.deepEqual(cc.maxKeyCacheTimeout, 9);
});

test("the KeySupportedGet command should serialize correctly", (t) => {
	const cc = new EntryControlCCKeySupportedGet(host, { nodeId: 1 });
	const expected = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.KeySupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the KeySupportedReport command should be deserialize correctly", (t) => {
	const data = buildCCBuffer(
		Buffer.from([
			EntryControlCommand.KeySupportedReport, // CC Command
			1,
			0b01011010,
		]),
	);

	const cc = new EntryControlCCKeySupportedReport(host, {
		nodeId: 1,
		data,
	});

	t.deepEqual(cc.supportedKeys, [1, 3, 4, 6]);
});
