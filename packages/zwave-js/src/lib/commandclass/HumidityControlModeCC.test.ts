import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { assertCC } from "../test/assertCC";
import { getCCValueMetadata } from "./CommandClass";
import {
	HumidityControlModeCC,
	HumidityControlModeCCGet,
	HumidityControlModeCCReport,
	HumidityControlModeCCSet,
	HumidityControlModeCCSupportedGet,
	HumidityControlModeCCSupportedReport,
} from "./HumidityControlModeCC";
import { HumidityControlMode, HumidityControlModeCommand } from "./_Types";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Mode"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/HumidityControlModeCC => ", () => {
	const nodeId = 2;

	it("the Get command should serialize correctly", () => {
		const cc = new HumidityControlModeCCGet(host, {
			nodeId,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlModeCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Set command should serialize correctly", () => {
		const cc = new HumidityControlModeCCSet(host, {
			nodeId,
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
		const cc = new HumidityControlModeCCReport(host, {
			nodeId,
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
		new HumidityControlModeCCReport(host, {
			nodeId,
			data: ccData,
		});

		const currentValue = host.getValueDB(nodeId).getValue({
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
		new HumidityControlModeCCReport(host, {
			nodeId,
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
		const cc = new HumidityControlModeCCSupportedGet(host, {
			nodeId,
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
		const cc = new HumidityControlModeCCSupportedReport(host, {
			nodeId,
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
		new HumidityControlModeCCSupportedReport(host, {
			nodeId,
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

	describe.skip(`interview()`, () => {
		beforeAll(() => {
			host.sendMessage
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
			host.controller.nodes.set(node.id, node);
		});
		beforeEach(() => host.sendMessage.mockClear());
		afterAll(() => {
			host.sendMessage.mockImplementation(() => Promise.resolve());
		});

		it("should send a HumidityControlModeCC.SupportedGet and then .Get", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview(host);

			expect(host.sendMessage).toBeCalled();

			assertCC(host.sendMessage.mock.calls[0][0], {
				cc: HumidityControlModeCC,
				nodeId,
				ccValues: {
					ccCommand: HumidityControlModeCommand.SupportedGet,
				},
			});

			assertCC(host.sendMessage.mock.calls[1][0], {
				cc: HumidityControlModeCC,
				nodeId,
				ccValues: {
					ccCommand: HumidityControlModeCommand.Get,
				},
			});
		});

		it("should set mode value", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview(host);

			const currentValue = host.getValueDB(nodeId).getValue({
				commandClass: CommandClasses["Humidity Control Mode"],
				property: "mode",
			});
			expect(currentValue).toEqual(HumidityControlMode.Auto);
		});

		it("should set mode metadata", async () => {
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Mode"],
			)!;
			await cc.interview(host);

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
