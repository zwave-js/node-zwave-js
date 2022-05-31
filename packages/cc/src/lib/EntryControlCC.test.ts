import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import {
	EntryControlCCConfigurationGet,
	EntryControlCCConfigurationReport,
	EntryControlCCConfigurationSet,
	EntryControlCCEventSupportedGet,
	EntryControlCCEventSupportedReport,
	EntryControlCCKeySupportedGet,
	EntryControlCCKeySupportedReport,
	EntryControlCCNotification,
} from "./EntryControlCC";
import {
	EntryControlCommand,
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Entry Control"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/EntryControlCC => ", () => {
	it("the Notification command should deserialize correctly", () => {
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

		expect(cc.sequenceNumber).toEqual(1);
		expect(cc.dataType).toEqual(EntryControlDataTypes.ASCII);
		expect(cc.eventType).toEqual(EntryControlEventTypes.DisarmAll);
		expect(cc.eventData).toEqual("1234");
	});

	it("the ConfigurationGet command should serialize correctly", () => {
		const cc = new EntryControlCCConfigurationGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				EntryControlCommand.ConfigurationGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationReport command should be deserialize correctly", () => {
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

		expect(cc.keyCacheSize).toEqual(1);
		expect(cc.keyCacheTimeout).toEqual(2);
	});

	it("the EventSupportedGet command should serialize correctly", () => {
		const cc = new EntryControlCCEventSupportedGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				EntryControlCommand.EventSupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the EventSupportedReport command should be deserialize correctly", () => {
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

		expect(cc.supportedDataTypes).toEqual([EntryControlDataTypes.ASCII]);
		expect(cc.supportedEventTypes).toEqual([
			EntryControlEventTypes.DisarmAll,
			EntryControlEventTypes.ArmAway,
			EntryControlEventTypes.ArmHome,
			EntryControlEventTypes.Cancel,
		]);
		expect(cc.minKeyCacheSize).toEqual(1);
		expect(cc.maxKeyCacheSize).toEqual(20);
		expect(cc.minKeyCacheTimeout).toEqual(2);
		expect(cc.maxKeyCacheTimeout).toEqual(9);
	});

	it("the KeySupportedGet command should serialize correctly", () => {
		const cc = new EntryControlCCKeySupportedGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				EntryControlCommand.KeySupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the KeySupportedReport command should be deserialize correctly", () => {
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

		expect(cc.supportedKeys).toEqual([1, 3, 4, 6]);
	});
});
