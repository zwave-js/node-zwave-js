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
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

const host = createTestingHost();
const nodeId = 2;

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Humidity Control Mode"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new HumidityControlModeCCGet({
		nodeId,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly", async (t) => {
	const cc = new HumidityControlModeCCSet({
		nodeId,
		mode: HumidityControlMode.Auto,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.Set, // CC Command
			0x03, // target value
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	t.expect(cc.constructor).toBe(HumidityControlModeCCReport);

	t.expect(cc.mode).toBe(HumidityControlMode.Auto);
});

test("the Report command should set the correct value", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const report = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Mode"],
		property: "mode",
	});
	t.expect(currentValue).toStrictEqual(HumidityControlMode.Auto);
});

test("the Report command should set the correct metadata", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.Report, // CC Command
			HumidityControlMode.Auto, // current value
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCReport;
	cc.persistValues(host);

	const currentValueMeta = host
		.getValueDB(nodeId)
		.getMetadata(HumidityControlModeCCValues.mode.id);

	t.expect(currentValueMeta).toMatchObject({
		states: enumValuesToMetadataStates(HumidityControlMode),
		label: "Humidity control mode",
	});
});

test("the SupportedGet command should serialize correctly", async (t) => {
	const cc = new HumidityControlModeCCSupportedGet({
		nodeId,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.SupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the SupportedReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.SupportedReport, // CC Command
			(1 << HumidityControlMode.Off) | (1 << HumidityControlMode.Auto),
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCSupportedReport;
	t.expect(cc.constructor).toBe(HumidityControlModeCCSupportedReport);

	t.expect(cc.supportedModes).toStrictEqual([
		HumidityControlMode.Off,
		HumidityControlMode.Auto,
	]);
});

test("the SupportedReport command should set the correct metadata", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlModeCommand.SupportedReport, // CC Command
			(1 << HumidityControlMode.Off) | (1 << HumidityControlMode.Auto),
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlModeCCSupportedReport;
	cc.persistValues(host);

	const currentValueMeta = host
		.getValueDB(nodeId)
		.getMetadata(HumidityControlModeCCValues.mode.id);

	t.expect(currentValueMeta).toMatchObject({
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
