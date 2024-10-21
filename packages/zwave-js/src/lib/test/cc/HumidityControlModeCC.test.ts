import {
	CommandClass,
	HumidityControlMode,
	HumidityControlModeCCGet,
	HumidityControlModeCCReport,
	HumidityControlModeCCSet,
	HumidityControlModeCCSupportedGet,
	HumidityControlModeCCSupportedReport,
	HumidityControlModeCommand,
} from "@zwave-js/cc";
import { HumidityControlModeCCValues } from "@zwave-js/cc/HumidityControlModeCC";
import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();
const nodeId = 2;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Mode"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new HumidityControlModeCCGet({
		nodeId,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Set command should serialize correctly", (t) => {
	const cc = new HumidityControlModeCCSet({
		nodeId,
		mode: HumidityControlMode.Auto,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.Set, // CC Command
			0x03, // target value
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	t.is(cc.constructor, HumidityControlModeCCReport);

	t.is(cc.mode, HumidityControlMode.Auto);
});

test("the Report command should set the correct value", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const report = CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Mode"],
		property: "mode",
	});
	t.deepEqual(currentValue, HumidityControlMode.Auto);
});

test("the Report command should set the correct metadata", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	cc.persistValues(host);

	const currentValueMeta = host
		.getValueDB(nodeId)
		.getMetadata(HumidityControlModeCCValues.mode.id);

	t.like(currentValueMeta, {
		states: enumValuesToMetadataStates(HumidityControlMode),
		label: "Humidity control mode",
	});
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new HumidityControlModeCCSupportedGet({
		nodeId,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize({} as any), expected);
});

test("the SupportedReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.SupportedReport, // CC Command
			(1 << HumidityControlMode.Off) | (1 << HumidityControlMode.Auto),
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCSupportedReport;
	t.is(cc.constructor, HumidityControlModeCCSupportedReport);

	t.deepEqual(cc.supportedModes, [
		HumidityControlMode.Off,
		HumidityControlMode.Auto,
	]);
});

test("the SupportedReport command should set the correct metadata", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlModeCommand.SupportedReport, // CC Command
			(1 << HumidityControlMode.Off) | (1 << HumidityControlMode.Auto),
		]),
	);
	const cc = CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCSupportedReport;
	cc.persistValues(host);

	const currentValueMeta = host
		.getValueDB(nodeId)
		.getMetadata(HumidityControlModeCCValues.mode.id);

	t.like(currentValueMeta, {
		states: {
			0: "Off",
			3: "Auto",
		},
		label: "Humidity control mode",
	});
});

// describe.skip(`interview()`, () => {
// 	beforeAll(() => {
// 		host.sendMessage
// 			.mockImplementationOnce(() =>
// 				Promise.resolve({
// 					command: {
// 						supportedModes: [
// 							HumidityControlMode.Off,
// 							HumidityControlMode.Humidify,
// 							HumidityControlMode.Auto,
// 						],
// 					},
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				Promise.resolve({
// 					command: { mode: HumidityControlMode.Humidify },
// 				}),
// 			);
// 		host.controller.nodes.set(node.id, node);
// 	});
// 	beforeEach(() => host.sendMessage.mockClear());
// 	afterAll(() => {
// 		host.sendMessage.mockImplementation(() => Promise.resolve());
// 	});

// 	test("should send a HumidityControlModeCC.SupportedGet and then .Get", async (t) => {
// 		const cc = node.createCCInstance(
// 			CommandClasses["Humidity Control Mode"],
// 		)!;
// 		await cc.interview(host);

// 		sinon.assert.called(host.sendMessage);

// 		assertCC(t, host.sendMessage.mock.calls[0][0], {
// 			cc: HumidityControlModeCC,
// 			nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlModeCommand.SupportedGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[1][0], {
// 			cc: HumidityControlModeCC,
// 			nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlModeCommand.Get,
// 			},
// 		});
// 	});

// 	test("should set mode value", async (t) => {
// 		const cc = node.createCCInstance(
// 			CommandClasses["Humidity Control Mode"],
// 		)!;
// 		await cc.interview(host);

// 		const currentValue = host.getValueDB(nodeId).getValue({
// 			commandClass: CommandClasses["Humidity Control Mode"],
// 			property: "mode",
// 		});
// 		t.deepEqual(currentValue, HumidityControlMode.Auto);
// 	});

// 	// test("should set mode metadata", async (t) => {
// 	// 	const cc = node.createCCInstance(
// 	// 		CommandClasses["Humidity Control Mode"],
// 	// 	)!;
// 	// 	await cc.interview(host);

// 	// 	const currentValueMeta = getCCValueMetadata(
// 	// 		CommandClasses["Humidity Control Mode"],
// 	// 		"mode",
// 	// 	);
// 	// 	t.like(currentValueMeta, {
// 	// 		states: {
// 	// 			0: "Off",
// 	// 			1: "Humidify",
// 	// 			3: "Auto",
// 	// 		},
// 	// 		label: "Humidity control mode",
// 	// 	});
// 	// });
// });
