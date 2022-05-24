import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { TestingHost } from "../test/mocks";
import {
	DoorLockCCCapabilitiesGet,
	DoorLockCCCapabilitiesReport,
	DoorLockCCConfigurationGet,
	DoorLockCCConfigurationReport,
	DoorLockCCConfigurationSet,
	DoorLockCCOperationGet,
	DoorLockCCOperationReport,
	DoorLockCCOperationSet,
	getBoltSupportedValueId,
	getDoorSupportedValueId,
	getLatchSupportedValueId,
} from "./DoorLockCC";
import { DoorLockCommand, DoorLockMode, DoorLockOperationType } from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Door Lock"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/DoorLockCC => ", () => {
	let host: TestingHost;

	beforeAll(() => {
		host = createTestingHost();

		// Node 1 supports all Door Lock sensors
		const valueDB1 = host.getValueDB(1);
		valueDB1.setValue(getDoorSupportedValueId(0), true);
		valueDB1.setValue(getBoltSupportedValueId(0), true);
		valueDB1.setValue(getLatchSupportedValueId(0), true);

		// Node 2 doesn't support the door sensor
		const valueDB2 = host.getValueDB(2);
		valueDB2.setValue(getDoorSupportedValueId(0), false);
		valueDB2.setValue(getBoltSupportedValueId(0), true);
		valueDB2.setValue(getLatchSupportedValueId(0), true);
	});

	it("the OperationGet command should serialize correctly", () => {
		const cc = new DoorLockCCOperationGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.OperationGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the OperationSet command should serialize correctly", () => {
		const cc = new DoorLockCCOperationSet(host, {
			nodeId: 2,
			mode: DoorLockMode.OutsideUnsecured,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.OperationSet, // CC Command
				0x20, // target value
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the OperationReport command (v1-v3) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.OperationReport, // CC Command
				DoorLockMode.InsideUnsecuredWithTimeout, // lock mode
				0b1000_0010, // handles mode
				0b010, // condition
				50, // timeout minutes
				20, // timeout seconds
			]),
		);
		const cc = new DoorLockCCOperationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.currentMode).toBe(DoorLockMode.InsideUnsecuredWithTimeout);
		expect(cc.outsideHandlesCanOpenDoor).toEqual([
			false,
			false,
			false,
			true,
		]);
		expect(cc.insideHandlesCanOpenDoor).toEqual([
			false,
			true,
			false,
			false,
		]);
		expect(cc.lockTimeout).toBe(50 * 60 + 20);
		expect(cc.latchStatus).toBe("open");
		expect(cc.boltStatus).toBe("unlocked");
		expect(cc.doorStatus).toBe("open");
		expect(cc.targetMode).toBeUndefined();
		expect(cc.duration).toBeUndefined();
	});

	it("the OperationReport command (v4) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.OperationReport, // CC Command
				DoorLockMode.OutsideUnsecured, // lock mode
				0b0100_1111, // handles mode
				0b101, // condition
				0x00, // timeout minutes
				0xfe, // invalid timeout seconds
				DoorLockMode.Secured,
				0x01, // 1 second left
			]),
		);
		const cc = new DoorLockCCOperationReport(host, {
			nodeId: 2,
			data: ccData,
		});

		expect(cc.currentMode).toBe(DoorLockMode.OutsideUnsecured);
		expect(cc.outsideHandlesCanOpenDoor).toEqual([
			false,
			false,
			true,
			false,
		]);
		expect(cc.insideHandlesCanOpenDoor).toEqual([true, true, true, true]);
		expect(cc.lockTimeout).toBeUndefined();
		expect(cc.latchStatus).toBe("closed");
		expect(cc.boltStatus).toBe("locked");
		expect(cc.doorStatus).toBe(undefined);
		expect(cc.targetMode).toBe(DoorLockMode.Secured);
		expect(cc.duration).toEqual(new Duration(1, "seconds"));
	});

	it("the ConfigurationGet command should serialize correctly", () => {
		const cc = new DoorLockCCConfigurationGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationReport command (v1-v3) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationReport, // CC Command
				DoorLockOperationType.Timed, // operation type
				0b1000_0010, // handles mode
				50, // timeout minutes
				20, // timeout seconds
			]),
		);
		const cc = new DoorLockCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.operationType).toBe(DoorLockOperationType.Timed);
		expect(cc.outsideHandlesCanOpenDoorConfiguration).toEqual([
			false,
			false,
			false,
			true,
		]);
		expect(cc.insideHandlesCanOpenDoorConfiguration).toEqual([
			false,
			true,
			false,
			false,
		]);
		expect(cc.lockTimeoutConfiguration).toBe(50 * 60 + 20);
		expect(cc.autoRelockTime).toBeUndefined();
		expect(cc.holdAndReleaseTime).toBeUndefined();
		expect(cc.twistAssist).toBeUndefined();
		expect(cc.blockToBlock).toBeUndefined();
	});

	it("the ConfigurationReport command must ignore invalid timeouts (constant)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationReport, // CC Command
				DoorLockOperationType.Constant, // operation type
				0b1000_0010, // handles mode
				50, // timeout minutes
				20, // timeout seconds
			]),
		);
		const cc = new DoorLockCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.lockTimeoutConfiguration).toBeUndefined();
	});

	it("the ConfigurationReport command must ignore invalid timeouts (invalid minutes)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationReport, // CC Command
				DoorLockOperationType.Constant, // operation type
				0b1000_0010, // handles mode
				0xff, // timeout minutes
				20, // timeout seconds
			]),
		);
		const cc = new DoorLockCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.lockTimeoutConfiguration).toBeUndefined();
	});

	it("the ConfigurationReport command must ignore invalid timeouts (invalid seconds)", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationReport, // CC Command
				DoorLockOperationType.Constant, // operation type
				0b1000_0010, // handles mode
				20, // timeout minutes
				0xff, // timeout seconds
			]),
		);
		const cc = new DoorLockCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.lockTimeoutConfiguration).toBeUndefined();
	});

	it("the ConfigurationReport command (v4) should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationReport, // CC Command
				DoorLockOperationType.Timed, // operation type
				0b1000_0010, // handles mode
				50, // timeout minutes
				20, // timeout seconds

				0xff, // auto relock
				0x01,
				0x02, // hold and release
				0x03,
				0b01, // flags
			]),
		);
		const cc = new DoorLockCCConfigurationReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.autoRelockTime).toBe(0xff01);
		expect(cc.holdAndReleaseTime).toBe(0x0203);
		expect(cc.twistAssist).toBeTrue();
		expect(cc.blockToBlock).toBeFalse();
	});

	it("the ConfigurationSet command (v1-3) should serialize correctly (timed)", () => {
		const cc = new DoorLockCCConfigurationSet(host, {
			nodeId: 2,
			operationType: DoorLockOperationType.Timed,
			outsideHandlesCanOpenDoorConfiguration: [false, true, true, true],
			insideHandlesCanOpenDoorConfiguration: [true, false, true, false],
			lockTimeoutConfiguration: 60 * 15 + 18,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationSet, // CC Command
				DoorLockOperationType.Timed,
				0b1110_0101,
				15,
				18,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command (v1-3) should serialize correctly (constant)", () => {
		const cc = new DoorLockCCConfigurationSet(host, {
			nodeId: 2,
			operationType: DoorLockOperationType.Constant,
			outsideHandlesCanOpenDoorConfiguration: [false, true, true, true],
			insideHandlesCanOpenDoorConfiguration: [true, false, true, false],
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationSet, // CC Command
				DoorLockOperationType.Constant,
				0b1110_0101,
				0xfe,
				0xfe,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ConfigurationSet command (v4) should serialize correctly", () => {
		const cc = new DoorLockCCConfigurationSet(host, {
			nodeId: 2,
			operationType: DoorLockOperationType.Timed,
			outsideHandlesCanOpenDoorConfiguration: [false, true, true, true],
			insideHandlesCanOpenDoorConfiguration: [true, false, true, false],
			lockTimeoutConfiguration: 60 * 15 + 18,
			autoRelockTime: 0xfefd,
			holdAndReleaseTime: undefined,
			blockToBlock: undefined,
			twistAssist: true,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.ConfigurationSet, // CC Command
				DoorLockOperationType.Timed,
				0b1110_0101,
				15,
				18,
				0xfe,
				0xfd,
				0,
				0,
				0b1,
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CapabilitiesGet command should serialize correctly", () => {
		const cc = new DoorLockCCCapabilitiesGet(host, { nodeId: 1 });
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.CapabilitiesGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CapabilitiesReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockCommand.CapabilitiesReport, // CC Command
				1, // bit mask length
				0b11, // operation types
				3, // list length
				DoorLockMode.Unsecured,
				DoorLockMode.InsideUnsecured,
				DoorLockMode.Secured,
				0b0000_0000, // handle modes
				0b111, // components
				0b1010, // feature flags
			]),
		);
		const cc = new DoorLockCCCapabilitiesReport(host, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.supportedOperationTypes).toEqual([
			DoorLockOperationType.Constant,
			DoorLockOperationType.Timed,
		]);
		expect(cc.supportedDoorLockModes).toEqual([
			DoorLockMode.Unsecured,
			DoorLockMode.InsideUnsecured,
			DoorLockMode.Secured,
		]);
		expect(cc.latchSupported).toBeTrue();
		expect(cc.boltSupported).toBeTrue();
		expect(cc.doorSupported).toBeTrue();

		expect(cc.autoRelockSupported).toBeTrue();
		expect(cc.holdAndReleaseSupported).toBeFalse();
		expect(cc.twistAssistSupported).toBeTrue();
		expect(cc.blockToBlockSupported).toBeFalse();
	});

	// it("the Report command (v2) should be deserialized correctly", () => {
	// 	const ccData = buildCCBuffer(
	// 		1,
	// 		Buffer.from([
	// 			DoorLockCommand.Report, // CC Command
	// 			55, // current value
	// 			66, // target value
	// 			1, // duration
	// 		]),
	// 	);
	// 	const cc = new DoorLockCCReport(host, { data: ccData });

	// 	expect(cc.currentValue).toBe(55);
	// 	expect(cc.targetValue).toBe(66);
	// 	expect(cc.duration!.unit).toBe("seconds");
	// 	expect(cc.duration!.value).toBe(1);
	// });

	// it("deserializing an unsupported command should return an unspecified version of DoorLockCC", () => {
	// 	const serializedCC = buildCCBuffer(
	// 		1,
	// 		Buffer.from([255]), // not a valid command
	// 	);
	// 	const cc: any = new DoorLockCC(host, {
	// 		data: serializedCC,
	// 	});
	// 	expect(cc.constructor).toBe(DoorLockCC);
	// });

	// it("the CC values should have the correct metadata", () => {
	// 	// Readonly, 0-99
	// 	const currentValueMeta = getCCValueMetadata(
	// 		CommandClasses.DoorLock,
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
	// 		CommandClasses.DoorLock,
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
