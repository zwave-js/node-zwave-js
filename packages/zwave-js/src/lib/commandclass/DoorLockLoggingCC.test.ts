import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import {
	DoorLockLoggingCCRecordsSupportedGet,
	DoorLockLoggingCCRecordsSupportedReport,
	// DoorLockLoggingCCRecordGet,
	// DoorLockLoggingCCRecordReport,
	// DoorLockLoggingEventType,
	DoorLockLoggingCommand,
} from "./DoorLockLoggingCC";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Door Lock Logging"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/DoorLockLoggingCC => ", () => {
	it("the RecordsSupportedGet command should serialize correctly", () => {
		const cc = new DoorLockLoggingCCRecordsSupportedGet(fakeDriver, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				DoorLockLoggingCommand.RecordsSupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the RecordsSupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				DoorLockLoggingCommand.RecordsSupportedReport, // CC Command
				20, // max records supported
			]),
		);
		const cc = new DoorLockLoggingCCRecordsSupportedReport(fakeDriver, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.supportedRecordsNumber).toBe(20);
	});

	describe(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses.DoorLockLogging, {
				version: 1,
				isSupported: true,
			});
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send a DoorLockLoggingCC.RecordsSupportedGet", async () => {
			node.addCC(CommandClasses["Door Lock Logging"], {
				isSupported: true,
			});
			const cc = node.createCCInstance(
				CommandClasses["Door Lock Logging"],
			)!;
			await cc.interview();

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
