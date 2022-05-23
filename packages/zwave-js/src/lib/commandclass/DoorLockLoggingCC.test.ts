import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import {
	DoorLockLoggingCC,
	DoorLockLoggingCCRecordGet,
	DoorLockLoggingCCRecordReport,
	DoorLockLoggingCCRecordsSupportedGet,
	DoorLockLoggingCCRecordsSupportedReport,
} from "./DoorLockLoggingCC";
import { DoorLockLoggingCommand, DoorLockLoggingEventType } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Door Lock Logging"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/DoorLockLoggingCC => ", () => {
	it("the RecordsCountGet command should serialize correctly", () => {
		const cc = new DoorLockLoggingCCRecordsSupportedGet(host, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockLoggingCommand.RecordsSupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the RecordsCountReport command should be deserialized correctly", () => {
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

		expect(cc.recordsCount).toBe(20);
	});

	it("the RecordGet command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the RecordReport command should be deserialized correctly", () => {
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

		expect(cc.recordNumber).toBe(7);

		expect(cc.record!.eventType).toBe(1);
		expect(cc.record!.label).toBe("Locked via Access Code");
		expect(cc.record!.timestamp).toBe(
			new Date(1989, 12 - 1, 27, 10, 40, 30).toISOString(),
		);
		expect(cc.record!.userId).toBe(1);
	});

	describe.skip(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

		beforeAll(() => {
			// reset Send Message implementation
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);

			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses["Door Lock Logging"], {
				version: 1,
				isSupported: true,
			});
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send a DoorLockLoggingCC.RecordsCountGet", async () => {
			node.addCC(CommandClasses["Door Lock Logging"], {
				isSupported: true,
			});
			const cc = node.createCCInstance(DoorLockLoggingCC)!;
			await cc.interview(fakeDriver);

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: DoorLockLoggingCCRecordsSupportedGet,
				nodeId: node.id,
			});
		});

		it.todo("Test the behavior when the request failed");

		it.todo("Test the behavior when the request succeeds");
	});
});
