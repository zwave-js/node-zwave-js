import {
	BatteryCC,
	BatteryCCGet,
	BatteryCCReport,
	BatteryChargingStatus,
	BatteryCommand,
	BatteryReplacementStatus,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

test("the Get command should serialize correctly", (t) => {
	const batteryCC = new BatteryCCGet(host, { nodeId: 1 });
	const expected = Buffer.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Get, // CC Command
	]);
	t.deepEqual(batteryCC.serialize(), expected);
});

test("the Report command (v1) should be deserialized correctly: when the battery is not low", (t) => {
	const ccData = Buffer.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		55, // current value
	]);
	const batteryCC = new BatteryCC(host, {
		nodeId: 7,
		data: ccData,
	}) as BatteryCCReport;

	t.is(batteryCC.level, 55);
	t.false(batteryCC.isLow);
});

test("the Report command (v1) should be deserialized correctly: when the battery is low", (t) => {
	const ccData = Buffer.from([
		CommandClasses.Battery, // CC
		BatteryCommand.Report, // CC Command
		0xff, // current value
	]);
	const batteryCC = new BatteryCC(host, {
		nodeId: 7,
		data: ccData,
	}) as BatteryCCReport;

	t.is(batteryCC.level, 0);
	t.true(batteryCC.isLow);
});

test("the Report command (v2) should be deserialized correctly: all flags set", (t) => {
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

	t.true(batteryCC.rechargeable);
	t.true(batteryCC.backup);
	t.true(batteryCC.overheating);
	t.true(batteryCC.lowFluid);
	t.true(batteryCC.disconnected);
});

test("the Report command (v2) should be deserialized correctly: charging status", (t) => {
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

	t.is(batteryCC.chargingStatus, BatteryChargingStatus.Maintaining);
});

test("the Report command (v2) should be deserialized correctly: recharge or replace", (t) => {
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

	t.is(batteryCC.rechargeOrReplace, BatteryReplacementStatus.Now);
});

test("deserializing an unsupported command should return an unspecified version of BatteryCC", (t) => {
	const serializedCC = Buffer.from([
		CommandClasses.Battery, // CC
		255, // not a valid command
	]);
	const basicCC: any = new BatteryCC(host, {
		nodeId: 7,
		data: serializedCC,
	});
	t.is(basicCC.constructor, BatteryCC);
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

// 		assertCCAva(t, fakeDriver.sendMessage.mock.calls[0][0], {
// 			cc: BatteryCCGet,
// 			nodeId: node.id,
// 		});
// 	});

// 	it.todo("Test the behavior when the request failed");

// 	it.todo("Test the behavior when the request succeeds");
// });
