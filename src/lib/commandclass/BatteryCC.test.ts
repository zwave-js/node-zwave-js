import { createEmptyMockDriver } from "../../../test/mocks";
import { assertCC } from "../../../test/util";
import { Driver } from "../driver/Driver";
import { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import {
	BatteryCC,
	BatteryCCGet,
	BatteryCCReport,
	BatteryCommand,
} from "./BatteryCC";
import { CommandClasses } from "./CommandClasses";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/BatteryCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const batteryCC = new BatteryCCGet(fakeDriver, { nodeId: 1 });
		const expected = Buffer.from([
			1, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			BatteryCommand.Get, // CC Command
		]);
		expect(batteryCC.serialize()).toEqual(expected);
	});

	describe("the Report command (v1) should be deserialized correctly", () => {
		it("when the battery is not low", () => {
			const ccData = Buffer.from([
				2, // node number
				3, // remaining length
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				55, // current value
			]);
			const batteryCC = new BatteryCC(fakeDriver, {
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(55);
			expect(batteryCC.isLow).toBeFalse();
		});

		it("when the battery is low", () => {
			const ccData = Buffer.from([
				2, // node number
				3, // remaining length
				CommandClasses.Battery, // CC
				BatteryCommand.Report, // CC Command
				0xff, // current value
			]);
			const batteryCC = new BatteryCC(fakeDriver, {
				data: ccData,
			}) as BatteryCCReport;

			expect(batteryCC.level).toBe(0);
			expect(batteryCC.isLow).toBeTrue();
		});
	});

	it("deserializing an unsupported command should return an unspecified version of BatteryCC", () => {
		const serializedCC = Buffer.from([
			2, // node number
			2, // remaining length
			CommandClasses.Battery, // CC
			255, // not a valid command
		]);
		const basicCC: any = new BatteryCC(fakeDriver, {
			data: serializedCC,
		});
		expect(basicCC.constructor).toBe(BatteryCC);
	});

	describe(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			fakeDriver.controller.nodes.set(node.id, node);
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
		});

		it("should send a BatteryCC.Get", async () => {
			node.addCC(CommandClasses.Battery, {
				isSupported: true,
			});
			const cc = node.createCCInstance(CommandClasses.Battery)!;
			await cc.interview();

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
