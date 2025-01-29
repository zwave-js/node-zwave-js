import {
	CommandClass,
	DoorLockCCCapabilitiesGet,
	DoorLockCCCapabilitiesReport,
	DoorLockCCConfigurationGet,
	DoorLockCCConfigurationReport,
	DoorLockCCConfigurationSet,
	DoorLockCCOperationGet,
	DoorLockCCOperationReport,
	DoorLockCCOperationSet,
	DoorLockCommand,
	DoorLockMode,
	DoorLockOperationType,
} from "@zwave-js/cc";
import { DoorLockCCValues } from "@zwave-js/cc/DoorLockCC";
import { CommandClasses, Duration } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Door Lock"], // CC
		]),
		payload,
	]);
}

const host = createTestingHost();

// Node 1 supports all Door Lock sensors
const valueDB1 = host.getValueDB(1);
valueDB1.setValue(DoorLockCCValues.doorSupported.id, true);
valueDB1.setValue(DoorLockCCValues.boltSupported.id, true);
valueDB1.setValue(DoorLockCCValues.latchSupported.id, true);

// Node 2 doesn't support the door sensor
const valueDB2 = host.getValueDB(2);
valueDB2.setValue(DoorLockCCValues.doorSupported.id, false);
valueDB2.setValue(DoorLockCCValues.boltSupported.id, true);
valueDB2.setValue(DoorLockCCValues.latchSupported.id, true);

test("the OperationGet command should serialize correctly", async (t) => {
	const cc = new DoorLockCCOperationGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.OperationGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the OperationSet command should serialize correctly", async (t) => {
	const cc = new DoorLockCCOperationSet({
		nodeId: 2,
		mode: DoorLockMode.OutsideUnsecured,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.OperationSet, // CC Command
			0x20, // target value
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the OperationReport command (v1-v3) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.OperationReport, // CC Command
			DoorLockMode.InsideUnsecuredWithTimeout, // lock mode
			0b1000_0010, // handles mode
			0b010, // condition
			50, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCOperationReport;
	t.expect(cc.constructor).toBe(DoorLockCCOperationReport);

	t.expect(cc.currentMode).toBe(DoorLockMode.InsideUnsecuredWithTimeout);
	t.expect(cc.outsideHandlesCanOpenDoor).toStrictEqual([
		false,
		false,
		false,
		true,
	]);
	t.expect(cc.insideHandlesCanOpenDoor).toStrictEqual([
		false,
		true,
		false,
		false,
	]);
	t.expect(cc.lockTimeout).toBe(50 * 60 + 20);
	t.expect(cc.latchStatus).toBe("open");
	t.expect(cc.boltStatus).toBe("unlocked");
	t.expect(cc.doorStatus).toBe("open");
	t.expect(cc.targetMode).toBeUndefined();
	t.expect(cc.duration).toBeUndefined();
});

test("the OperationReport command (v4) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as DoorLockCCOperationReport;
	t.expect(cc.constructor).toBe(DoorLockCCOperationReport);
	cc.persistValues(host);

	t.expect(cc.currentMode).toBe(DoorLockMode.OutsideUnsecured);
	t.expect(cc.outsideHandlesCanOpenDoor).toStrictEqual([
		false,
		false,
		true,
		false,
	]);
	t.expect(cc.insideHandlesCanOpenDoor).toStrictEqual([
		true,
		true,
		true,
		true,
	]);
	t.expect(cc.lockTimeout).toBeUndefined();
	t.expect(cc.latchStatus).toBe("closed");
	t.expect(cc.boltStatus).toBe("locked");
	// The CC itself contains the door status, but it does not get persisted (unsupported)
	t.expect(cc.doorStatus).toBe("closed");
	t.expect(
		host
			.getValueDB(cc.nodeId as number)
			.getValue(DoorLockCCValues.doorStatus.endpoint(cc.endpointIndex)),
	).toBeUndefined();
	t.expect(cc.targetMode).toBe(DoorLockMode.Secured);
	t.expect(cc.duration).toStrictEqual(new Duration(1, "seconds"));
});

test("the ConfigurationGet command should serialize correctly", async (t) => {
	const cc = new DoorLockCCConfigurationGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the ConfigurationReport command (v1-v3) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Timed, // operation type
			0b1000_0010, // handles mode
			50, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.expect(cc.constructor).toBe(DoorLockCCConfigurationReport);

	t.expect(cc.operationType).toBe(DoorLockOperationType.Timed);
	t.expect(cc.outsideHandlesCanOpenDoorConfiguration).toStrictEqual([
		false,
		false,
		false,
		true,
	]);
	t.expect(cc.insideHandlesCanOpenDoorConfiguration).toStrictEqual([
		false,
		true,
		false,
		false,
	]);
	t.expect(cc.lockTimeoutConfiguration).toBe(50 * 60 + 20);
	t.expect(cc.autoRelockTime).toBeUndefined();
	t.expect(cc.holdAndReleaseTime).toBeUndefined();
	t.expect(cc.twistAssist).toBeUndefined();
	t.expect(cc.blockToBlock).toBeUndefined();
});

test("the ConfigurationReport command must ignore invalid timeouts (constant)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			50, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.expect(cc.constructor).toBe(DoorLockCCConfigurationReport);

	t.expect(cc.lockTimeoutConfiguration).toBeUndefined();
});

test("the ConfigurationReport command must ignore invalid timeouts (invalid minutes)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			0xff, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.expect(cc.constructor).toBe(DoorLockCCConfigurationReport);

	t.expect(cc.lockTimeoutConfiguration).toBeUndefined();
});

test("the ConfigurationReport command must ignore invalid timeouts (invalid seconds)", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			20, // timeout minutes
			0xff, // timeout seconds
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.expect(cc.constructor).toBe(DoorLockCCConfigurationReport);

	t.expect(cc.lockTimeoutConfiguration).toBeUndefined();
});

test("the ConfigurationReport command (v4) should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
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
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.expect(cc.constructor).toBe(DoorLockCCConfigurationReport);

	t.expect(cc.autoRelockTime).toBe(0xff01);
	t.expect(cc.holdAndReleaseTime).toBe(0x0203);
	t.expect(cc.twistAssist).toBe(true);
	t.expect(cc.blockToBlock).toBe(false);
});

test("the ConfigurationSet command (v4) should serialize correctly", async (t) => {
	const cc = new DoorLockCCConfigurationSet({
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
		Uint8Array.from([
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
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the CapabilitiesGet command should serialize correctly", async (t) => {
	const cc = new DoorLockCCCapabilitiesGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.CapabilitiesGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the CapabilitiesReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.CapabilitiesReport, // CC Command
			1, // bit mask length
			0b110, // operation types
			3, // list length
			DoorLockMode.Unsecured,
			DoorLockMode.InsideUnsecured,
			DoorLockMode.Secured,
			0b0000_0000, // handle modes
			0b111, // components
			0b1010, // feature flags
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCCapabilitiesReport;
	t.expect(cc.constructor).toBe(DoorLockCCCapabilitiesReport);

	t.expect(cc.supportedOperationTypes).toStrictEqual([
		DoorLockOperationType.Constant,
		DoorLockOperationType.Timed,
	]);
	t.expect(cc.supportedDoorLockModes).toStrictEqual([
		DoorLockMode.Unsecured,
		DoorLockMode.InsideUnsecured,
		DoorLockMode.Secured,
	]);
	t.expect(cc.latchSupported).toBe(true);
	t.expect(cc.boltSupported).toBe(true);
	t.expect(cc.doorSupported).toBe(true);

	t.expect(cc.autoRelockSupported).toBe(true);
	t.expect(cc.holdAndReleaseSupported).toBe(false);
	t.expect(cc.twistAssistSupported).toBe(true);
	t.expect(cc.blockToBlockSupported).toBe(false);
});

// test("the Report command (v2) should be deserialized correctly", (t) => {
// 	const ccData = buildCCBuffer(
// 		1,
// 		Uint8Array.from([
// 			DoorLockCommand.Report, // CC Command
// 			55, // current value
// 			66, // target value
// 			1, // duration
// 		]),
// 	);
// 	const cc = new DoorLockCCReport({ data: ccData });

// 	t.is(cc.currentValue, 55);
// 	t.is(cc.targetValue, 66);
// 	t.is(cc.duration!.unit, "seconds");
// 	t.is(cc.duration!.value, 1);
// });

// test("deserializing an unsupported command should return an unspecified version of DoorLockCC", (t) => {
// 	const serializedCC = buildCCBuffer(
// 		1,
// 		Uint8Array.from([255]), // not a valid command
// 	);
// 	const cc: any = new DoorLockCC({
// 		data: serializedCC,
// 	});
// 	t.is(cc.constructor, DoorLockCC);
// });

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses.DoorLock,
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
// 		CommandClasses.DoorLock,
// 		"targetValue",
// 	);
// 	t.like(targetValueMeta, {
// 		readable: true,
// 		writeable: true,
// 		min: 0,
// 		max: 99,
// 	});
// });
