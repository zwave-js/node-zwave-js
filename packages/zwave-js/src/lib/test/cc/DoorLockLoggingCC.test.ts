import {
	CommandClass,
	DoorLockLoggingCCRecordGet,
	DoorLockLoggingCCRecordReport,
	DoorLockLoggingCCRecordsSupportedGet,
	DoorLockLoggingCCRecordsSupportedReport,
	DoorLockLoggingCommand,
	DoorLockLoggingEventType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Door Lock Logging"], // CC
		]),
		payload,
	]);
}

test("the RecordsCountGet command should serialize correctly", async (t) => {
	const cc = new DoorLockLoggingCCRecordsSupportedGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockLoggingCommand.RecordsSupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the RecordsCountReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockLoggingCommand.RecordsSupportedReport, // CC Command
			0x14, // max records supported (20)
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockLoggingCCRecordsSupportedReport;
	t.expect(cc.constructor).toBe(DoorLockLoggingCCRecordsSupportedReport);

	t.expect(cc.recordsCount).toBe(20);
});

test("the RecordGet command should serialize correctly", async (t) => {
	const cc = new DoorLockLoggingCCRecordGet({
		nodeId: 1,
		recordNumber: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			DoorLockLoggingCommand.RecordGet, // CC Command
			1, // Record Number
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the RecordReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			DoorLockLoggingCommand.RecordReport, // CC Command
			7, // record number
			0x07, // year 1/2
			0xc5, // year 2/2
			12, // month
			27, // day
			0x2a, // RecordStatus.HoldsData, 10 (hour)
			40, // minute
			30, // second
			DoorLockLoggingEventType.LockCode, // event type
			1, // user id
			0, // user code length
			0, // user code data
		]),
	);

	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as DoorLockLoggingCCRecordReport;
	t.expect(cc.constructor).toBe(DoorLockLoggingCCRecordReport);

	t.expect(cc.recordNumber).toBe(7);

	t.expect(cc.record!.eventType).toBe(1);
	t.expect(cc.record!.label).toBe("Locked via Access Code");
	t.expect(
		cc.record!.timestamp,
	).toBe(new Date(1989, 12 - 1, 27, 10, 40, 30).toISOString());
	t.expect(cc.record!.userId).toBe(1);
});

// describe.skip(`interview()`, () => {
// 	const fakeDriver = createEmptyMockDriver();
// 	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

// 	beforeAll(() => {
// 		// reset Send Message implementation
// 		fakeDriver.sendMessage.mockImplementation(() =>
// 			Promise.resolve({ command: {} }),
// 		);

// 		fakeDriver.controller.nodes.set(node.id, node);
// 		node.addCC(CommandClasses["Door Lock Logging"], {
// 			version: 1,
// 			isSupported: true,
// 		});
// 	});
// 	beforeEach(() => fakeDriver.sendMessage.mockClear());
// 	afterAll(() => {
// 		fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
// 		node.destroy();
// 	});

// 	test("should send a DoorLockLoggingCC.RecordsCountGet", async (t) => {
// 		node.addCC(CommandClasses["Door Lock Logging"], {
// 			isSupported: true,
// 		});
// 		const cc = node.createCCInstance(DoorLockLoggingCC)!;
// 		await cc.interview(fakeDriver);

// 		sinon.assert.called(fakeDriver.sendMessage);

// 		assertCC(t, fakeDriver.sendMessage.mock.calls[0][0], {
// 			cc: DoorLockLoggingCCRecordsSupportedGet,
// 			nodeId: node.id,
// 		});
// 	});

// 	it.todo("Test the behavior when the request failed");

// 	it.todo("Test the behavior when the request succeeds");
// });
