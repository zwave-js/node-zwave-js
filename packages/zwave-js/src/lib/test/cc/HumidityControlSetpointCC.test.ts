import {
	CommandClass,
	HumidityControlSetpointCCCapabilitiesGet,
	HumidityControlSetpointCCCapabilitiesReport,
	HumidityControlSetpointCCGet,
	HumidityControlSetpointCCReport,
	HumidityControlSetpointCCScaleSupportedGet,
	HumidityControlSetpointCCScaleSupportedReport,
	HumidityControlSetpointCCSet,
	HumidityControlSetpointCCSupportedGet,
	HumidityControlSetpointCCSupportedReport,
	HumidityControlSetpointCommand,
	HumidityControlSetpointType,
} from "@zwave-js/cc";
import { CommandClasses, encodeFloatWithScale } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Humidity Control Setpoint"], // CC
		]),
		payload,
	]);
}

const host = createTestingHost();
const nodeId = 2;

test("the Get command should serialize correctly", async (t) => {
	const cc = new HumidityControlSetpointCCGet({
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Humidifier,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.Get, // CC Command
			HumidityControlSetpointType.Humidifier, // type
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Set command should serialize correctly", async (t) => {
	const cc = new HumidityControlSetpointCCSet({
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Humidifier,
		value: 57,
		scale: 1,
	});
	const expected = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.Set, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(57, 1),
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCReport;
	t.expect(cc.constructor).toBe(HumidityControlSetpointCCReport);

	t.expect(cc.type).toStrictEqual(HumidityControlSetpointType.Humidifier);
	t.expect(cc.scale).toBe(1);
	// t.like(cc.scale, {
	// 	key: 1,
	// 	label: "Absolute humidity",
	// 	unit: "g/m³",
	// });
	t.expect(cc.value).toBe(12);
});

test("the Report command should set the correct value", async (t) => {
	const ccData = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const report = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCReport;
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.expect(currentValue).toStrictEqual(12);

	const scaleValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpointScale",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.expect(scaleValue).toStrictEqual(1);
});

test("the Report command should set the correct metadata", async (t) => {
	const ccData = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const report = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCReport;
	report.persistValues(host);

	const setpointMeta = host.getValueDB(nodeId).getMetadata({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.expect(setpointMeta).toMatchObject({
		unit: "g/m³",
		ccSpecific: {
			setpointType: HumidityControlSetpointType.Humidifier,
		},
	});
});

test("the SupportedGet command should serialize correctly", async (t) => {
	const cc = new HumidityControlSetpointCCSupportedGet({
		nodeId: nodeId,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.SupportedGet, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the SupportedReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.SupportedReport, // CC Command
			(1 << HumidityControlSetpointType.Humidifier)
			| (1 << HumidityControlSetpointType.Auto),
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCSupportedReport;
	t.expect(cc.constructor).toBe(HumidityControlSetpointCCSupportedReport);

	t.expect(cc.supportedSetpointTypes).toStrictEqual([
		HumidityControlSetpointType.Humidifier,
		HumidityControlSetpointType.Auto,
	]);
});

test("the SupportedReport command should set the correct value", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.SupportedReport, // CC Command
			(1 << HumidityControlSetpointType.Humidifier)
			| (1 << HumidityControlSetpointType.Auto),
		]),
	);
	const report = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCSupportedReport;
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "supportedSetpointTypes",
	});
	t.expect(currentValue).toStrictEqual([
		HumidityControlSetpointType.Humidifier,
		HumidityControlSetpointType.Auto,
	]);
});

test("the ScaleSupportedGet command should serialize correctly", async (t) => {
	const cc = new HumidityControlSetpointCCScaleSupportedGet({
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Auto,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.ScaleSupportedGet, // CC Command
			HumidityControlSetpointType.Auto, // type
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the ScaleSupportedReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.ScaleSupportedReport, // CC Command
			0b11, // percent + absolute
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCScaleSupportedReport;
	t.expect(cc.constructor).toBe(
		HumidityControlSetpointCCScaleSupportedReport,
	);

	t.expect(cc.supportedScales).toStrictEqual([0, 1]);
	// 	new Scale(0, {
	// 		label: "Percentage value",
	// 		unit: "%",
	// 	}),
	// 	new Scale(1, {
	// 		label: "Absolute humidity",
	// 		unit: "g/m³",
	// 	}),
	// ]);
});

test("the CapabilitiesGet command should serialize correctly", async (t) => {
	const cc = new HumidityControlSetpointCCCapabilitiesGet({
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Auto,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlSetpointCommand.CapabilitiesGet, // CC Command
			HumidityControlSetpointType.Auto, // type
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the CapabilitiesReport command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.CapabilitiesReport, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(10, 1),
			encodeFloatWithScale(90, 1),
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCCapabilitiesReport;
	t.expect(cc.constructor).toBe(HumidityControlSetpointCCCapabilitiesReport);

	t.expect(cc.type).toStrictEqual(HumidityControlSetpointType.Humidifier);
	t.expect(cc.minValue).toStrictEqual(10);
	t.expect(cc.minValueScale).toStrictEqual(1);
	t.expect(cc.maxValue).toStrictEqual(90);
	t.expect(cc.maxValueScale).toStrictEqual(1);
});

test("the CapabilitiesReport command should set the correct metadata", async (t) => {
	const ccData = buildCCBuffer(
		Bytes.concat([
			Uint8Array.from([
				HumidityControlSetpointCommand.CapabilitiesReport, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(10, 1),
			encodeFloatWithScale(90, 1),
		]),
	);
	const report = await CommandClass.parse(
		ccData,
		{ sourceNodeId: nodeId } as any,
	) as HumidityControlSetpointCCCapabilitiesReport;
	report.persistValues(host);

	const setpointMeta = host.getValueDB(nodeId).getMetadata({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.expect(setpointMeta).toMatchObject({
		min: 10,
		max: 90,
		unit: "g/m³",
		ccSpecific: {
			setpointType: HumidityControlSetpointType.Humidifier,
		},
	});
});

// describe.skip(`interview()`, () => {
// 	beforeAll(async () => {
// 		const supportedScales = [
// 			new Scale(0, { label: "Percentage", unit: "%" }),
// 			new Scale(1, { label: "Absolute", unit: "g/m³" }),
// 		];
// 		host.sendMessage
// 			.mockImplementationOnce(() =>
// 				// SupportedGet
// 				Promise.resolve({
// 					command: {
// 						supportedSetpointTypes: [
// 							HumidityControlSetpointType.Humidifier,
// 							HumidityControlSetpointType.Auto,
// 						],
// 					},
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// ScaleSupportedGet for Humidifier
// 				Promise.resolve({
// 					command: { supportedScales: supportedScales },
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// CapabilitiesGet for Humidifier
// 				Promise.resolve({
// 					command: {
// 						minValue: 1,
// 						maxValue: 99,
// 						minValueScale: supportedScales[0].key,
// 						maxValueScale: supportedScales[0].key,
// 					},
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// ScaleSupportedGet for Auto
// 				Promise.resolve({
// 					command: { supportedScales: supportedScales },
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// CapabilitiesGet for Auto
// 				Promise.resolve({
// 					command: {
// 						minValue: 54,
// 						maxValue: 71,
// 						minValueScale: supportedScales[1].key,
// 						maxValueScale: supportedScales[1].key,
// 					},
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// Get for Humidifier
// 				Promise.resolve({
// 					command: {
// 						type: HumidityControlSetpointType.Humidifier,
// 						value: 71,
// 						scale: supportedScales[0],
// 					},
// 				}),
// 			)
// 			.mockImplementationOnce(() =>
// 				// Get for Auto
// 				Promise.resolve({
// 					command: {
// 						type: HumidityControlSetpointType.Auto,
// 						value: 32,
// 						scale: supportedScales[1],
// 					},
// 				}),
// 			);
// 		host.controller.nodes.set(nodeId, node);
// 	});
// 	beforeEach(() => host.sendMessage.mockClear());
// 	afterAll(() => {
// 		host.sendMessage.mockImplementation(() => Promise.resolve());
// 		node.destroy();
// 	});

// 	test("should send expected commands", async (t) => {
// 		const cc = node.createCCInstance(
// 			CommandClasses["Humidity Control Setpoint"],
// 		)!;
// 		await cc.interview(host);

// 		sinon.assert.called(host.sendMessage);

// 		assertCC(t, host.sendMessage.mock.calls[0][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.SupportedGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[1][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[2][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[3][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[4][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[5][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.Get,
// 			},
// 		});

// 		assertCC(t, host.sendMessage.mock.calls[6][0], {
// 			cc: HumidityControlSetpointCC,
// 			nodeId: nodeId,
// 			ccValues: {
// 				ccCommand: HumidityControlSetpointCommand.Get,
// 			},
// 		});
// 	});

// 	test("should set setpointScale metadata", async (t) => {
// 		const cc = node.createCCInstance(
// 			CommandClasses["Humidity Control Setpoint"],
// 		)!;
// 		await cc.interview(host);

// 		let setpointScaleMeta = host.getValueDB(nodeId).getMetadata({
// 			commandClass: CommandClasses["Humidity Control Setpoint"],
// 			property: "setpointScale",
// 			propertyKey: HumidityControlSetpointType.Humidifier,
// 		});
// 		t.like(setpointScaleMeta, {
// 			states: {
// 				0: "%",
// 				1: "g/m³",
// 			},
// 		});

// 		setpointScaleMeta = host.getValueDB(nodeId).getMetadata({
// 			commandClass: CommandClasses["Humidity Control Setpoint"],
// 			property: "setpointScale",
// 			propertyKey: HumidityControlSetpointType.Auto,
// 		});
// 		t.like(setpointScaleMeta, {
// 			states: {
// 				0: "%",
// 				1: "g/m³",
// 			},
// 		});
// 	});
// });
