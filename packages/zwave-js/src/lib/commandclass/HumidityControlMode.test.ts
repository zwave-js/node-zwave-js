import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { getCCValueMetadata } from "./CommandClass";
import {
	HumidityControlMode,
	HumidityControlModeCC,
	HumidityControlModeCCGet,
	HumidityControlModeCCReport,
	HumidityControlModeCCSet,
	HumidityControlModeCCSupportedGet,
	HumidityControlModeCCSupportedReport,
	HumidityControlModeCommand,
} from "./HumidityControlModeCC";

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Mode"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/HumidityControlModeCC => ", () => {
	let fakeDriver: Driver;
	let node: ZWaveNode;

	beforeAll(() => {
		fakeDriver = createEmptyMockDriver() as unknown as Driver;
		node = new ZWaveNode(1, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(1, node);
		node.addCC(CommandClasses["Humidity Control Mode"], {
			isSupported: true,
			version: 2,
		});
	});

	afterAll(() => {
		node.destroy();
	});

	it("the Get command should serialize correctly", () => {
		const cc = new HumidityControlModeCCGet(fakeDriver, {
			nodeId: node.id,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const cc = new HumidityControlModeCCSet(fakeDriver, {
			nodeId: node.id,
			mode: HumidityControlMode.Auto,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Set, // CC Command
				0x03, // target value
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Report, // CC Command
				HumidityControlMode.Auto, // current value
			]),
		);
		const cc = new HumidityControlModeCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		expect(cc.mode).toBe(HumidityControlMode.Auto);
	});

	it("the Report command should set the correct value", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Report, // CC Command
				HumidityControlMode.Auto, // current value
			]),
		);
		new HumidityControlModeCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const currentValue = node.valueDB.getValue({
			commandClass: CommandClasses["Humidity Control Mode"],
			property: "mode",
		});
		expect(currentValue).toEqual(HumidityControlMode.Auto);
	});

	it("the Report command should set the correct metadata", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Report, // CC Command
				HumidityControlMode.Auto, // current value
			]),
		);
		new HumidityControlModeCCReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const currentValueMeta = getCCValueMetadata(
			CommandClasses["Humidity Control Mode"],
			"mode",
		);
		expect(currentValueMeta).toMatchObject({
			states: enumValuesToMetadataStates(HumidityControlMode),
			label: "Humidity control mode",
		});
	});

	it("the SupportedGet command should serialize correctly", () => {
		const cc = new HumidityControlModeCCSupportedGet(fakeDriver, {
			nodeId: node.id,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.SupportedGet, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the SupportedReport command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.SupportedReport, // CC Command
				(1 << HumidityControlMode.Off) |
					(1 << HumidityControlMode.Auto),
			]),
		);
		const cc = new HumidityControlModeCCSupportedReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		expect(cc.supportedModes).toEqual([
			HumidityControlMode.Off,
			HumidityControlMode.Auto,
		]);
	});

	it("the SupportedReport command should set the correct metadata", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.SupportedReport, // CC Command
				(1 << HumidityControlMode.Off) |
					(1 << HumidityControlMode.Auto),
			]),
		);
		new HumidityControlModeCCSupportedReport(fakeDriver, {
			nodeId: node.id,
			data: ccData,
		});

		const currentValueMeta = getCCValueMetadata(
			CommandClasses["Humidity Control Mode"],
			"mode",
		);
		expect(currentValueMeta).toMatchObject({
			states: {
				0: "Off",
				3: "Auto",
			},
			label: "Humidity control mode",
		});
	});

	describe(`interview()`, () => {
		beforeAll(() => {
			fakeDriver.sendMessage
				.mockImplementationOnce(() =>
					Promise.resolve({
						command: {
							supportedModes: [
								HumidityControlMode.Off,
								HumidityControlMode.Humidify,
								HumidityControlMode.Auto,
							],
						},
					}),
				)
				.mockImplementationOnce(() =>
					Promise.resolve({
						command: { mode: HumidityControlMode.Humidify },
					}),
				);
			fakeDriver.controller.nodes.set(node.id, node);
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
		});

		it("should send a HumidityControlModeCC.SupportedGet and then .Get", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview();

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: HumidityControlModeCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlModeCommand.SupportedGet,
				},
			});

			assertCC(fakeDriver.sendMessage.mock.calls[1][0], {
				cc: HumidityControlModeCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlModeCommand.Get,
				},
			});
		});

		it("should set mode value", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview();

			const currentValue = node.valueDB.getValue({
				commandClass: CommandClasses["Humidity Control Mode"],
				property: "mode",
			});
			expect(currentValue).toEqual(HumidityControlMode.Auto);
		});

		it("should set mode metadata", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview();

			const currentValueMeta = getCCValueMetadata(
				CommandClasses["Humidity Control Mode"],
				"mode",
			);
			expect(currentValueMeta).toMatchObject({
				states: {
					0: "Off",
					1: "Humidify",
					3: "Auto",
				},
				label: "Humidity control mode",
			});
		});
	});
});
