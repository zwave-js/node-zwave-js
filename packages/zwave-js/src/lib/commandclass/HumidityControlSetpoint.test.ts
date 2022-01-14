import { loadNamedScalesInternal, Scale } from "@zwave-js/config";
import { CommandClasses, encodeFloatWithScale } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import {
	HumidityControlSetpointCC,
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
} from "./HumidityControlSetpointCC";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Setpoint"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/HumidityControlSetpointCC => ", () => {
	let fakeDriver: Driver;
	let node: ZWaveNode;

	beforeAll(async () => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;
		await fakeDriver.configManager.loadNamedScales();
		node = new ZWaveNode(1, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(1, node);
		node.addCC(CommandClasses["Humidity Control Setpoint"], {
			isSupported: true,
			version: 2,
		});

		loadNamedScalesInternal();
	});

	afterAll(() => {
		node.destroy();
	});

	it("the Get command should serialize correctly", () => {
		const cc = new HumidityControlSetpointCCGet(fakeDriver, {
			nodeId: node.id,
			setpointType: HumidityControlSetpointType.Humidifier,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.Get, // CC Command
				HumidityControlSetpointType.Humidifier, // type
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const cc = new HumidityControlSetpointCCSet(fakeDriver, {
			nodeId: node.id,
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.concat([
				Buffer.from([
					HumidityControlSetpointCommand.Report, // CC Command
					HumidityControlSetpointType.Humidifier, // type
				]),
				encodeFloatWithScale(12, 1),
			]),
		);
		const cc = new HumidityControlSetpointCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		expect(cc.type).toEqual(HumidityControlSetpointType.Humidifier);
		expect(cc.scale).toMatchObject({
			key: 1,
			label: "Absolute humidity",
			unit: "g/m³",
		});
		expect(cc.value).toBe(12);
	});

	it("the Report command should set the correct value", () => {
		const ccData = buildCCBuffer(
			Buffer.concat([
				Buffer.from([
					HumidityControlSetpointCommand.Report, // CC Command
					HumidityControlSetpointType.Humidifier, // type
				]),
				encodeFloatWithScale(12, 1),
			]),
		);
		new HumidityControlSetpointCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const currentValue = node.valueDB.getValue({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "setpoint",
			propertyKey: HumidityControlSetpointType.Humidifier,
		});
		expect(currentValue).toEqual(12);

		const scaleValue = node.valueDB.getValue({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "setpointScale",
			propertyKey: HumidityControlSetpointType.Humidifier,
		});
		expect(scaleValue).toEqual(1);
	});

	it("the Report command should set the correct metadata", () => {
		const ccData = buildCCBuffer(
			Buffer.concat([
				Buffer.from([
					HumidityControlSetpointCommand.Report, // CC Command
					HumidityControlSetpointType.Humidifier, // type
				]),
				encodeFloatWithScale(12, 1),
			]),
		);
		new HumidityControlSetpointCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const setpointMeta = node.valueDB.getMetadata({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "setpoint",
			propertyKey: HumidityControlSetpointType.Humidifier,
		});
		expect(setpointMeta).toMatchObject({
			unit: "g/m³",
			ccSpecific: {
				setpointType: HumidityControlSetpointType.Humidifier,
			},
		});
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new HumidityControlSetpointCCSupportedGet(fakeDriver, {
			nodeId: node.id,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.SupportedReport, // CC Command
				(1 << HumidityControlSetpointType.Humidifier) |
					(1 << HumidityControlSetpointType.Auto),
			]),
		);
		const cc = new HumidityControlSetpointCCSupportedReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		expect(cc.supportedSetpointTypes).toEqual([
			HumidityControlSetpointType.Humidifier,
			HumidityControlSetpointType.Auto,
		]);
	});

	it("the SupportedReport command should set the correct value", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.SupportedReport, // CC Command
				(1 << HumidityControlSetpointType.Humidifier) |
					(1 << HumidityControlSetpointType.Auto),
			]),
		);
		new HumidityControlSetpointCCSupportedReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const currentValue = node.valueDB.getValue({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "supportedSetpointTypes",
		});
		expect(currentValue).toEqual([
			HumidityControlSetpointType.Humidifier,
			HumidityControlSetpointType.Auto,
		]);
	});

	it("the ScaleSupportedGet command should serialize correctly", () => {
		const cc = new HumidityControlSetpointCCScaleSupportedGet(fakeDriver, {
			nodeId: node.id,
			setpointType: HumidityControlSetpointType.Auto,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.ScaleSupportedGet, // CC Command
				HumidityControlSetpointType.Auto, // type
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ScaleSupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.ScaleSupportedReport, // CC Command
				0b11, // percent + absolute
			]),
		);
		const cc = new HumidityControlSetpointCCScaleSupportedReport(
			fakeDriver,
			{
				nodeId: node.id,
				data: ccData,
			},
		);

		expect(cc.supportedScales).toEqual([
			new Scale(0, {
				label: "Percentage value",
				unit: "%",
			}),
			new Scale(1, {
				label: "Absolute humidity",
				unit: "g/m³",
			}),
		]);
	});

	it("the CapabilitiesGet command should serialize correctly", () => {
		const cc = new HumidityControlSetpointCCCapabilitiesGet(fakeDriver, {
			nodeId: node.id,
			setpointType: HumidityControlSetpointType.Auto,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlSetpointCommand.CapabilitiesGet, // CC Command
				HumidityControlSetpointType.Auto, // type
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the CapabilitiesReport command should be deserialized correctly", () => {
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
		const cc = new HumidityControlSetpointCCCapabilitiesReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		expect(cc.type).toEqual(HumidityControlSetpointType.Humidifier);
		expect(cc.minValue).toEqual(10);
		expect(cc.minValueScale).toEqual(1);
		expect(cc.maxValue).toEqual(90);
		expect(cc.maxValueScale).toEqual(1);
	});

	it("the CapabilitiesReport command should set the correct metadata", () => {
		const ccData = buildCCBuffer(
			Buffer.concat([
				Buffer.from([
					HumidityControlSetpointCommand.Report, // CC Command
					HumidityControlSetpointType.Humidifier, // type
				]),
				encodeFloatWithScale(10, 1),
				encodeFloatWithScale(90, 1),
			]),
		);
		new HumidityControlSetpointCCCapabilitiesReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const setpointMeta = node.valueDB.getMetadata({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "setpoint",
			propertyKey: HumidityControlSetpointType.Humidifier,
		});
		expect(setpointMeta).toMatchObject({
			min: 10,
			max: 90,
			unit: "g/m³",
			ccSpecific: {
				setpointType: HumidityControlSetpointType.Humidifier,
			},
		});
	});

	describe(`interview()`, () => {
		beforeAll(async () => {
			const supportedScales = [
				new Scale(0, { label: "Percentage", unit: "%" }),
				new Scale(1, { label: "Absolute", unit: "g/m³" }),
			];
			fakeDriver.sendMessage
				.mockImplementationOnce(() =>
					// SupportedGet
					Promise.resolve({
						command: {
							supportedSetpointTypes: [
								HumidityControlSetpointType.Humidifier,
								HumidityControlSetpointType.Auto,
							],
						},
					}),
				)
				.mockImplementationOnce(() =>
					// ScaleSupportedGet for Humidifier
					Promise.resolve({
						command: { supportedScales: supportedScales },
					}),
				)
				.mockImplementationOnce(() =>
					// CapabilitiesGet for Humidifier
					Promise.resolve({
						command: {
							minValue: 1,
							maxValue: 99,
							minValueScale: supportedScales[0].key,
							maxValueScale: supportedScales[0].key,
						},
					}),
				)
				.mockImplementationOnce(() =>
					// ScaleSupportedGet for Auto
					Promise.resolve({
						command: { supportedScales: supportedScales },
					}),
				)
				.mockImplementationOnce(() =>
					// CapabilitiesGet for Auto
					Promise.resolve({
						command: {
							minValue: 54,
							maxValue: 71,
							minValueScale: supportedScales[1].key,
							maxValueScale: supportedScales[1].key,
						},
					}),
				)
				.mockImplementationOnce(() =>
					// Get for Humidifier
					Promise.resolve({
						command: {
							type: HumidityControlSetpointType.Humidifier,
							value: 71,
							scale: supportedScales[0],
						},
					}),
				)
				.mockImplementationOnce(() =>
					// Get for Auto
					Promise.resolve({
						command: {
							type: HumidityControlSetpointType.Auto,
							value: 32,
							scale: supportedScales[1],
						},
					}),
				);
			fakeDriver.controller.nodes.set(node.id, node);
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send expected commands", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Setpoint"],
			)!;
			await cc.interview();

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.SupportedGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[1][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[2][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[3][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[4][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[5][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.Get,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[6][0], {
				cc: HumidityControlSetpointCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.Get,
				},
			});
		});

		it("should set setpointScale metadata", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Setpoint"],
			)!;
			await cc.interview();

			let setpointScaleMeta = node.valueDB.getMetadata({
				commandClass: CommandClasses["Humidity Control Setpoint"],
				property: "setpointScale",
				propertyKey: HumidityControlSetpointType.Humidifier,
			});
			expect(setpointScaleMeta).toMatchObject({
				states: {
					0: "%",
					1: "g/m³",
				},
			});

			setpointScaleMeta = node.valueDB.getMetadata({
				commandClass: CommandClasses["Humidity Control Setpoint"],
				property: "setpointScale",
				propertyKey: HumidityControlSetpointType.Auto,
			});
			expect(setpointScaleMeta).toMatchObject({
				states: {
					0: "%",
					1: "g/m³",
				},
			});
		});
	});
});
