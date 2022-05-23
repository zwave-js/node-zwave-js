import { Scale } from "@zwave-js/config";
import { CommandClasses, encodeFloatWithScale } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { assertCC } from "../test/assertCC";
import { TestingHost } from "../test/mocks";
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
} from "./HumidityControlSetpointCC";
import {
	HumidityControlSetpointCommand,
	HumidityControlSetpointType,
} from "./_Types";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Setpoint"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/HumidityControlSetpointCC => ", () => {
	let host: TestingHost;
	const nodeId = 2;

	beforeAll(
		async () => {
			host = createTestingHost();
			await host.configManager.loadNamedScales();
		},
		// Loading configuration may take a while on CI
		30000,
	);

	it("the Get command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
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
		const cc = new HumidityControlSetpointCCReport(host, {
			nodeId: nodeId,
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
		new HumidityControlSetpointCCReport(host, {
			nodeId: nodeId,
			data: ccData,
		});

		const currentValue = host.getValueDB(nodeId).getValue({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "setpoint",
			propertyKey: HumidityControlSetpointType.Humidifier,
		});
		expect(currentValue).toEqual(12);

		const scaleValue = host.getValueDB(nodeId).getValue({
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
		new HumidityControlSetpointCCReport(host, {
			nodeId: nodeId,
			data: ccData,
		});

		const setpointMeta = host.getValueDB(nodeId).getMetadata({
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
		const cc = new HumidityControlSetpointCCSupportedGet(host, {
			nodeId: nodeId,
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
		const cc = new HumidityControlSetpointCCSupportedReport(host, {
			nodeId: nodeId,
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
		new HumidityControlSetpointCCSupportedReport(host, {
			nodeId: nodeId,
			data: ccData,
		});

		const currentValue = host.getValueDB(nodeId).getValue({
			commandClass: CommandClasses["Humidity Control Setpoint"],
			property: "supportedSetpointTypes",
		});
		expect(currentValue).toEqual([
			HumidityControlSetpointType.Humidifier,
			HumidityControlSetpointType.Auto,
		]);
	});

	it("the ScaleSupportedGet command should serialize correctly", () => {
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
		expect(cc.serialize()).toEqual(expected);
	});

	it("the ScaleSupportedReport command should be deserialized correctly", () => {
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
		const cc = new HumidityControlSetpointCCCapabilitiesReport(host, {
			nodeId: nodeId,
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
		new HumidityControlSetpointCCCapabilitiesReport(host, {
			nodeId: nodeId,
			data: ccData,
		});

		const setpointMeta = host.getValueDB(nodeId).getMetadata({
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

	describe.skip(`interview()`, () => {
		beforeAll(async () => {
			const supportedScales = [
				new Scale(0, { label: "Percentage", unit: "%" }),
				new Scale(1, { label: "Absolute", unit: "g/m³" }),
			];
			host.sendMessage
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
			host.controller.nodes.set(nodeId, node);
		});
		beforeEach(() => host.sendMessage.mockClear());
		afterAll(() => {
			host.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send expected commands", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Setpoint"],
			)!;
			await cc.interview(host);

			expect(host.sendMessage).toBeCalled();

			assertCC(host.sendMessage.mock.calls[0][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.SupportedGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[1][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[2][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[3][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.ScaleSupportedGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[4][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.CapabilitiesGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[5][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.Get,
				},
			});

			assertCC(host.sendMessage.mock.calls[6][0], {
				cc: HumidityControlSetpointCC,
				nodeId: nodeId,
				ccValues: {
					ccCommand: HumidityControlSetpointCommand.Get,
				},
			});
		});

		it("should set setpointScale metadata", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Setpoint"],
			)!;
			await cc.interview(host);

			let setpointScaleMeta = host.getValueDB(nodeId).getMetadata({
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

			setpointScaleMeta = host.getValueDB(nodeId).getMetadata({
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
