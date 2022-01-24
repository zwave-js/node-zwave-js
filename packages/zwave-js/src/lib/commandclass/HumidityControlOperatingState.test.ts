import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { getCCValueMetadata } from "./CommandClass";
import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCC,
	HumidityControlOperatingStateCCGet,
	HumidityControlOperatingStateCCReport,
	HumidityControlOperatingStateCommand,
} from "./HumidityControlOperatingStateCC";

const fakeDriver = createEmptyMockDriver() as unknown as Driver;

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Operating State"], // CC
		]),
		payload,
	]);
}

describe("lib/commandclass/HumidityControlOperatingStateCC => ", () => {
	it("the Get command should serialize correctly", () => {
		const cc = new HumidityControlOperatingStateCCGet(fakeDriver, {
			nodeId: 1,
		});
		const expected = buildCCBuffer(
			Buffer.from([
				HumidityControlOperatingStateCommand.Get, // CC Command
			]),
		);
		expect(cc.serialize()).toEqual(expected);
	});

	it("the Report command should be deserialized correctly", () => {
		const ccData = buildCCBuffer(
			Buffer.from([
				HumidityControlOperatingStateCommand.Report, // CC Command
				HumidityControlOperatingState.Humidifying, // state
			]),
		);
		const cc = new HumidityControlOperatingStateCCReport(fakeDriver, {
			nodeId: 1,
			data: ccData,
		});

		expect(cc.state).toBe(HumidityControlOperatingState.Humidifying);
	});

	it("the CC values should have the correct metadata", () => {
		// Readonly, 0-99
		const currentValueMeta = getCCValueMetadata(
			CommandClasses["Humidity Control Operating State"],
			"state",
		);
		expect(currentValueMeta).toMatchObject({
			states: enumValuesToMetadataStates(HumidityControlOperatingState),
			label: "Humidity control operating state",
		});
	});

	describe(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			fakeDriver.controller.nodes.set(node.id, node);
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send a HumidityControlOperatingStateCC.Get", async () => {
			node.addCC(CommandClasses["Humidity Control Operating State"], {
				isSupported: true,
			});
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Operating State"],
			)!;
			await cc.interview();

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: HumidityControlOperatingStateCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlOperatingStateCommand.Get,
				},
			});
		});
	});
});
