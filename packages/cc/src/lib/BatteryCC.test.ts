import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { BatteryCC, BatteryCCGet, BatteryCCReport } from "./BatteryCC";
import {
	BatteryChargingStatus,
	BatteryCommand,
	BatteryReplacementStatus,
} from "./_Types";

const host = createTestingHost();

describe("lib/commandclass/BatteryCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const batteryCC = new BatteryCCGet(host, { nodeId: 1 });
		const expected = Buffer.from([
			CommandClasses.Battery, // CC
			BatteryCommand.Get, // CC Command
		]);
		expect(batteryCC.serialize()).toEqual(expected);
	});

	describe("the Report command (v1) should be deserialized correctly", () => {
		it("when the battery is not low", () => {
			const ccData = Buffer.from([
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55, // current value
			]);
			const batteryCC = new BatteryCC(host, {
				nodeId: 7,
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(55);
			expect(batteryCC.isLow).toBeFalse();
		});

		it("when the battery is low", () => {
			const ccData = Buffer.from([
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				0xff, // current value
			]);
			const batteryCC = new BatteryCC(host, {
				nodeId: 7,
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(0);
			expect(batteryCC.isLow).toBeTrue();
		});
	});

	describe("the Report command (v2) should be deserialized correctly", () => {
		it("all flags set", () => {
			const ccData = Buffer.from([
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55, // current value
				0b00_1111_00,
				1, // disconnected
			]);
			const batteryCC = new BatteryCC(host, {
				nodeId: 7,
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.rechargeable).toBeTrue();
			expect(batteryCC.backup).toBeTrue();
			expect(batteryCC.overheating).toBeTrue();
			expect(batteryCC.lowFluid).toBeTrue();
			expect(batteryCC.disconnected).toBeTrue();
		});

		it("charging status", () => {
			const ccData = Buffer.from([
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55,
				0b10_000000, // Maintaining
				0,
			]);
			const batteryCC = new BatteryCC(host, {
				nodeId: 7,
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.chargingStatus).toBe(
				BatteryChargingStatus.Maintaining,
			);
		});

		it("charging status", () => {
			const ccData = Buffer.from([
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55,
				0b11, // Maintaining
				0,
			]);
			const batteryCC = new BatteryCC(host, {
				nodeId: 7,
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.rechargeOrReplace).toBe(
				BatteryReplacementStatus.Now,
			);
		});
	});

	it("deserializing an unsupported command should return an unspecified version of BatteryCC", () => {
		const serializedCC = Buffer.from([
			CommandClasses.Battery, // CC
			255, // not a valid command
		]);
		const basicCC: any = new BatteryCC(host, {
			nodeId: 7,
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BatteryCC);
	});

	describe.skip(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses.Battery, {
				version: 2,
				isSupported: true,
			});
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send a BatteryCC.Get", async () => {
			node.addCC(CommandClasses.Battery, {
				isSupported: true,
			});
			const cc = node.createCCInstance(CommandClasses.Battery)!;
			await cc.interview(fakeDriver);

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: BatteryCCGet,
				nodeId: node.id,
			});
		});

		it.todo("Test the behavior when the request failed");

		it.todo("Test the behavior when the request succeeds");
	});
});
