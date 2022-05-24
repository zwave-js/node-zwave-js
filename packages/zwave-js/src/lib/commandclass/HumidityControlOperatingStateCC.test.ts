import { CommandClasses, enumValuesToMetadataStates } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { getCCValueMetadata } from "./CommandClass";
import {
	HumidityControlOperatingStateCC,
	HumidityControlOperatingStateCCGet,
	HumidityControlOperatingStateCCReport,
} from "./HumidityControlOperatingStateCC";
import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCommand,
} from "./_Types";

const host = createTestingHost();

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
		const cc = new HumidityControlOperatingStateCCGet(host, {
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
		const cc = new HumidityControlOperatingStateCCReport(host, {
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

	describe.skip(`interview()`, () => {
		const host = createEmptyMockDriver();
		const node = new ZWaveNode(2, host as unknown as Driver);

		beforeAll(() => {
			host.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			host.controller.nodes.set(node.id, node);
		});
		beforeEach(() => host.sendMessage.mockClear());
		afterAll(() => {
			host.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should send a HumidityControlOperatingStateCC.Get", async () => {
			node.addCC(CommandClasses["Humidity Control Operating State"], {
				isSupported: true,
			});
			const cc = node.createCCInstance(
				CommandClasses["Humidity Control Operating State"],
			)!;
			await cc.interview(host);

			expect(host.sendMessage).toBeCalled();

			assertCC(host.sendMessage.mock.calls[0][0], {
				cc: HumidityControlOperatingStateCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: HumidityControlOperatingStateCommand.Get,
				},
			});
		});
	});
});
