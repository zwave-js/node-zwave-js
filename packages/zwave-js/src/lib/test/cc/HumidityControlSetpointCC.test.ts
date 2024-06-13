import {
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
import test from "ava";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Setpoint"], // CC
		]),
		payload,
	]);
}

const host = createTestingHost();
const nodeId = 2;

test("the Get command should serialize correctly", (t) => {
	const cc = new HumidityControlSetpointCCGet(host, {
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Humidifier,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.Get, // CC Command
			HumidityControlSetpointType.Humidifier, // type
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Set command should serialize correctly", (t) => {
	const cc = new HumidityControlSetpointCCSet(host, {
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Humidifier,
		value: 57,
		scale: 1,
	});
	const expected = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.Set, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(57, 1),
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const cc = new HumidityControlSetpointCCReport(host, {
		nodeId: nodeId,
		data: ccData,
	});

	t.deepEqual(cc.type, HumidityControlSetpointType.Humidifier);
	t.is(cc.scale, 1);
	// t.like(cc.scale, {
	// 	key: 1,
	// 	label: "Absolute humidity",
	// 	unit: "g/m³",
	// });
	t.is(cc.value, 12);
});

test("the Report command should set the correct value", (t) => {
	const ccData = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const report = new HumidityControlSetpointCCReport(host, {
		nodeId: nodeId,
		data: ccData,
	});
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.deepEqual(currentValue, 12);

	const scaleValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpointScale",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.deepEqual(scaleValue, 1);
});

test("the Report command should set the correct metadata", (t) => {
	const ccData = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.Report, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(12, 1),
		]),
	);
	const report = new HumidityControlSetpointCCReport(host, {
		nodeId: nodeId,
		data: ccData,
	});
	report.persistValues(host);

	const setpointMeta = host.getValueDB(nodeId).getMetadata({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.like(setpointMeta, {
		unit: "g/m³",
		ccSpecific: {
			setpointType: HumidityControlSetpointType.Humidifier,
		},
	});
});

test("the SupportedGet command should serialize correctly", (t) => {
	const cc = new HumidityControlSetpointCCSupportedGet(host, {
		nodeId: nodeId,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.SupportedGet, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the SupportedReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.SupportedReport, // CC Command
			(1 << HumidityControlSetpointType.Humidifier)
			| (1 << HumidityControlSetpointType.Auto),
		]),
	);
	const cc = new HumidityControlSetpointCCSupportedReport(host, {
		nodeId: nodeId,
		data: ccData,
	});

	t.deepEqual(cc.supportedSetpointTypes, [
		HumidityControlSetpointType.Humidifier,
		HumidityControlSetpointType.Auto,
	]);
});

test("the SupportedReport command should set the correct value", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.SupportedReport, // CC Command
			(1 << HumidityControlSetpointType.Humidifier)
			| (1 << HumidityControlSetpointType.Auto),
		]),
	);
	const report = new HumidityControlSetpointCCSupportedReport(host, {
		nodeId: nodeId,
		data: ccData,
	});
	report.persistValues(host);

	const currentValue = host.getValueDB(nodeId).getValue({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "supportedSetpointTypes",
	});
	t.deepEqual(currentValue, [
		HumidityControlSetpointType.Humidifier,
		HumidityControlSetpointType.Auto,
	]);
});

test("the ScaleSupportedGet command should serialize correctly", (t) => {
	const cc = new HumidityControlSetpointCCScaleSupportedGet(host, {
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Auto,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.ScaleSupportedGet, // CC Command
			HumidityControlSetpointType.Auto, // type
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the ScaleSupportedReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.ScaleSupportedReport, // CC Command
			0b11, // percent + absolute
		]),
	);
	const cc = new HumidityControlSetpointCCScaleSupportedReport(host, {
		nodeId: nodeId,
		data: ccData,
	});

	t.deepEqual(cc.supportedScales, [0, 1]);
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

test("the CapabilitiesGet command should serialize correctly", (t) => {
	const cc = new HumidityControlSetpointCCCapabilitiesGet(host, {
		nodeId: nodeId,
		setpointType: HumidityControlSetpointType.Auto,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlSetpointCommand.CapabilitiesGet, // CC Command
			HumidityControlSetpointType.Auto, // type
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the CapabilitiesReport command should be deserialized correctly", (t) => {
	const ccData = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.CapabilitiesReport, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(10, 1),
			encodeFloatWithScale(90, 1),
		]),
	);
	const cc = new HumidityControlSetpointCCCapabilitiesReport(host, {
		nodeId: nodeId,
		data: ccData,
	});

	t.deepEqual(cc.type, HumidityControlSetpointType.Humidifier);
	t.deepEqual(cc.minValue, 10);
	t.deepEqual(cc.minValueScale, 1);
	t.deepEqual(cc.maxValue, 90);
	t.deepEqual(cc.maxValueScale, 1);
});

test("the CapabilitiesReport command should set the correct metadata", (t) => {
	const ccData = buildCCBuffer(
		Buffer.concat([
			Buffer.from([
				HumidityControlSetpointCommand.CapabilitiesReport, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
			encodeFloatWithScale(10, 1),
			encodeFloatWithScale(90, 1),
		]),
	);
	const report = new HumidityControlSetpointCCCapabilitiesReport(host, {
		nodeId: nodeId,
		data: ccData,
	});
	report.persistValues(host);

	const setpointMeta = host.getValueDB(nodeId).getMetadata({
		commandClass: CommandClasses["Humidity Control Setpoint"],
		property: "setpoint",
		propertyKey: HumidityControlSetpointType.Humidifier,
	});
	t.like(setpointMeta, {
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
