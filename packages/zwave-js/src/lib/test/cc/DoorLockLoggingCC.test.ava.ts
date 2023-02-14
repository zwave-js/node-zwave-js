import {
	DoorLockLoggingCCRecordGet,
	DoorLockLoggingCCRecordReport,
	DoorLockLoggingCCRecordsSupportedGet,
	DoorLockLoggingCCRecordsSupportedReport,
	DoorLockLoggingCommand,
	DoorLockLoggingEventType,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Door Lock Logging"], // CC
		]),
		payload,
	]);
}

test("the RecordsCountGet command should serialize correctly", (t) => {
	const cc = new DoorLockLoggingCCRecordsSupportedGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			DoorLockLoggingCommand.RecordsSupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the RecordsCountReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			DoorLockLoggingCommand.RecordsSupportedReport, // CC Command
			0x14, // max records supported (20)
		]),
	);
	const cc = new DoorLockLoggingCCRecordsSupportedReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.recordsCount, 20);
});

test("the RecordGet command should serialize correctly", (t) => {
	const cc = new DoorLockLoggingCCRecordGet(host, {
		nodeId: 1,
		recordNumber: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			DoorLockLoggingCommand.RecordGet, // CC Command
			1, // Record Number
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the RecordReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
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

	const cc = new DoorLockLoggingCCRecordReport(host, {
		nodeId: 1,
		data: ccData,
	});

	t.is(cc.recordNumber, 7);

	t.is(cc.record!.eventType, 1);
	t.is(cc.record!.label, "Locked via Access Code");
	t.is(
		cc.record!.timestamp,
		new Date(1989, 12 - 1, 27, 10, 40, 30).toISOString(),
	);
	t.is(cc.record!.userId, 1);
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

// 		assertCCAva(t, fakeDriver.sendMessage.mock.calls[0][0], {
// 			cc: DoorLockLoggingCCRecordsSupportedGet,
// 			nodeId: node.id,
// 		});
// 	});

// 	it.todo("Test the behavior when the request failed");

// 	it.todo("Test the behavior when the request succeeds");
// });
