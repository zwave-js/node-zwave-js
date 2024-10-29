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
import test from "ava";

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

test("the OperationGet command should serialize correctly", (t) => {
	const cc = new DoorLockCCOperationGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.OperationGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the OperationSet command should serialize correctly", (t) => {
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
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the OperationReport command (v1-v3) should be deserialized correctly", (t) => {
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCOperationReport;
	t.is(cc.constructor, DoorLockCCOperationReport);

	t.is(cc.currentMode, DoorLockMode.InsideUnsecuredWithTimeout);
	t.deepEqual(cc.outsideHandlesCanOpenDoor, [false, false, false, true]);
	t.deepEqual(cc.insideHandlesCanOpenDoor, [false, true, false, false]);
	t.is(cc.lockTimeout, 50 * 60 + 20);
	t.is(cc.latchStatus, "open");
	t.is(cc.boltStatus, "unlocked");
	t.is(cc.doorStatus, "open");
	t.is(cc.targetMode, undefined);
	t.is(cc.duration, undefined);
});

test("the OperationReport command (v4) should be deserialized correctly", (t) => {
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 2 } as any,
	) as DoorLockCCOperationReport;
	t.is(cc.constructor, DoorLockCCOperationReport);
	cc.persistValues(host);

	t.is(cc.currentMode, DoorLockMode.OutsideUnsecured);
	t.deepEqual(cc.outsideHandlesCanOpenDoor, [false, false, true, false]);
	t.deepEqual(cc.insideHandlesCanOpenDoor, [true, true, true, true]);
	t.is(cc.lockTimeout, undefined);
	t.is(cc.latchStatus, "closed");
	t.is(cc.boltStatus, "locked");
	// The CC itself contains the door status, but it does not get persisted (unsupported)
	t.is(cc.doorStatus, "closed");
	t.is(
		host
			.getValueDB(cc.nodeId as number)
			.getValue(DoorLockCCValues.doorStatus.endpoint(cc.endpointIndex)),
		undefined,
	);
	t.is(cc.targetMode, DoorLockMode.Secured);
	t.deepEqual(cc.duration, new Duration(1, "seconds"));
});

test("the ConfigurationGet command should serialize correctly", (t) => {
	const cc = new DoorLockCCConfigurationGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the ConfigurationReport command (v1-v3) should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Timed, // operation type
			0b1000_0010, // handles mode
			50, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.is(cc.constructor, DoorLockCCConfigurationReport);

	t.is(cc.operationType, DoorLockOperationType.Timed);
	t.deepEqual(cc.outsideHandlesCanOpenDoorConfiguration, [
		false,
		false,
		false,
		true,
	]);
	t.deepEqual(cc.insideHandlesCanOpenDoorConfiguration, [
		false,
		true,
		false,
		false,
	]);
	t.is(cc.lockTimeoutConfiguration, 50 * 60 + 20);
	t.is(cc.autoRelockTime, undefined);
	t.is(cc.holdAndReleaseTime, undefined);
	t.is(cc.twistAssist, undefined);
	t.is(cc.blockToBlock, undefined);
});

test("the ConfigurationReport command must ignore invalid timeouts (constant)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			50, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.is(cc.constructor, DoorLockCCConfigurationReport);

	t.is(cc.lockTimeoutConfiguration, undefined);
});

test("the ConfigurationReport command must ignore invalid timeouts (invalid minutes)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			0xff, // timeout minutes
			20, // timeout seconds
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.is(cc.constructor, DoorLockCCConfigurationReport);

	t.is(cc.lockTimeoutConfiguration, undefined);
});

test("the ConfigurationReport command must ignore invalid timeouts (invalid seconds)", (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.ConfigurationReport, // CC Command
			DoorLockOperationType.Constant, // operation type
			0b1000_0010, // handles mode
			20, // timeout minutes
			0xff, // timeout seconds
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.is(cc.constructor, DoorLockCCConfigurationReport);

	t.is(cc.lockTimeoutConfiguration, undefined);
});

test("the ConfigurationReport command (v4) should be deserialized correctly", (t) => {
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCConfigurationReport;
	t.is(cc.constructor, DoorLockCCConfigurationReport);

	t.is(cc.autoRelockTime, 0xff01);
	t.is(cc.holdAndReleaseTime, 0x0203);
	t.true(cc.twistAssist);
	t.false(cc.blockToBlock);
});

test("the ConfigurationSet command (v4) should serialize correctly", (t) => {
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
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the CapabilitiesGet command should serialize correctly", (t) => {
	const cc = new DoorLockCCCapabilitiesGet({ nodeId: 1 });
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockCommand.CapabilitiesGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the CapabilitiesReport command should be deserialized correctly", (t) => {
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
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockCCCapabilitiesReport;
	t.is(cc.constructor, DoorLockCCCapabilitiesReport);

	t.deepEqual(cc.supportedOperationTypes, [
		DoorLockOperationType.Constant,
		DoorLockOperationType.Timed,
	]);
	t.deepEqual(cc.supportedDoorLockModes, [
		DoorLockMode.Unsecured,
		DoorLockMode.InsideUnsecured,
		DoorLockMode.Secured,
	]);
	t.true(cc.latchSupported);
	t.true(cc.boltSupported);
	t.true(cc.doorSupported);

	t.true(cc.autoRelockSupported);
	t.false(cc.holdAndReleaseSupported);
	t.true(cc.twistAssistSupported);
	t.false(cc.blockToBlockSupported);
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
