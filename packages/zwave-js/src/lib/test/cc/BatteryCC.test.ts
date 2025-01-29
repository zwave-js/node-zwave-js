import {
	BatteryCC,
	BatteryCCGet,
	BatteryCCReport,
	BatteryChargingStatus,
	BatteryCommand,
	BatteryReplacementStatus,
	CommandClass,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";
import { test } from "vitest";

test("the Get command should serialize correctly", async (t) => {
	const batteryCC = new BatteryCCGet({ nodeId: 1 });
	const expected = Bytes.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Get, // CC Command
	]);
	await t.expect(batteryCC.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command (v1) should be deserialized correctly: when the battery is not low", async (t) => {
	const ccData = Uint8Array.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		55, // current value
	]);
	const batteryCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCCReport);

	t.expect(batteryCC.level).toBe(55);
	t.expect(batteryCC.isLow).toBe(false);
});

test("the Report command (v1) should be deserialized correctly: when the battery is low", async (t) => {
	const ccData = Uint8Array.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		0xff, // current value
	]);
	const batteryCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCCReport);

	t.expect(batteryCC.level).toBe(0);
	t.expect(batteryCC.isLow).toBe(true);
});

test("the Report command (v2) should be deserialized correctly: all flags set", async (t) => {
	const ccData = Uint8Array.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		55, // current value
		0b00_1111_00,
		1, // disconnected
	]);
	const batteryCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCCReport);

	t.expect(batteryCC.rechargeable).toBe(true);
	t.expect(batteryCC.backup).toBe(true);
	t.expect(batteryCC.overheating).toBe(true);
	t.expect(batteryCC.lowFluid).toBe(true);
	t.expect(batteryCC.disconnected).toBe(true);
});

test("the Report command (v2) should be deserialized correctly: charging status", async (t) => {
	const ccData = Uint8Array.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		55,
		0b10_000000, // Maintaining
		0,
	]);
	const batteryCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCCReport);

	t.expect(batteryCC.chargingStatus).toBe(BatteryChargingStatus.Maintaining);
});

test("the Report command (v2) should be deserialized correctly: recharge or replace", async (t) => {
	const ccData = Uint8Array.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		55,
		0b11, // Maintaining
		0,
	]);
	const batteryCC = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCCReport);

	t.expect(batteryCC.rechargeOrReplace).toBe(BatteryReplacementStatus.Now);
});

test("deserializing an unsupported command should return an unspecified version of BatteryCC", async (t) => {
	const serializedCC = Uint8Array.from([
		CommandClasses.Battery, // CC
		255, // not a valid command
	]);
	const batteryCC = await CommandClass.parse(
		serializedCC,
		{ sourceNodeId: 7 } as any,
	) as BatteryCCReport;
	t.expect(batteryCC.constructor).toBe(BatteryCC);
});

// describe.skip(`interview()`, () => {
// 	const fakeDriver = createEmptyMockDriver();
// 	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

// 	beforeAll(() => {
// 		fakeDriver.sendMessage.mockImplementation(() =>
// 			Promise.resolve({ command: {} }),
// 		);
// 		fakeDriver.controller.nodes.set(node.id, node);
// 		node.addCC(CommandClasses.Battery, {
// 			version: 2,
// 			isSupported: true,
// 		});
// 	});
// 	beforeEach(() => fakeDriver.sendMessage.mockClear());
// 	afterAll(() => {
// 		fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
// 		node.destroy();
// 	});

// 	test("should send a BatteryCC.Get", async (t) => {
// 		node.addCC(CommandClasses.Battery, {
// 			isSupported: true,
// 		});
// 		const cc = node.createCCInstance(CommandClasses.Battery)!;
// 		await cc.interview(fakeDriver);

// 		sinon.assert.called(fakeDriver.sendMessage);

// 		assertCC(t, fakeDriver.sendMessage.mock.calls[0][0], {
// 			cc: BatteryCCGet,
// 			nodeId: node.id,
// 		});
// 	});

// 	it.todo("Test the behavior when the request failed");

// 	it.todo("Test the behavior when the request succeeds");
// });
