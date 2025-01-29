import {
	CommandClass,
	HumidityControlOperatingState,
	HumidityControlOperatingStateCCGet,
	HumidityControlOperatingStateCCReport,
	HumidityControlOperatingStateCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Humidity Control Operating State"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", async (t) => {
	const cc = new HumidityControlOperatingStateCCGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			HumidityControlOperatingStateCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

test("the Report command should be deserialized correctly", async (t) => {
	const ccData = buildCCBuffer(
		Uint8Array.from([
			HumidityControlOperatingStateCommand.Report, // CC Command
			HumidityControlOperatingState.Humidifying, // state
		]),
	);
	const cc = await CommandClass.parse(
		ccData,
		{ sourceNodeId: 1 } as any,
	) as HumidityControlOperatingStateCCReport;
	t.expect(cc.constructor).toBe(HumidityControlOperatingStateCCReport);

	t.expect(cc.state).toBe(HumidityControlOperatingState.Humidifying);
});

// test("the CC values should have the correct metadata", (t) => {
// 	// Readonly, 0-99
// 	const currentValueMeta = getCCValueMetadata(
// 		CommandClasses["Humidity Control Operating State"],
// 		"state",
// 	);
// 	t.like(currentValueMeta, {
// 		states: enumValuesToMetadataStates(HumidityControlOperatingState),
// 		label: "Humidity control operating state",
// 	});
// });

// describe.skip(`interview()`, () => {
// 	const host = createEmptyMockDriver();
// 	const node = new ZWaveNode(2, host as unknown as Driver);

// 	beforeAll(() => {
// 		host.sendMessage.resolves({ command: {} });
// 		host.controller.nodes.set(node.id, node);
// 	});
// 	beforeEach(() => host.sendMessage.resetHistory());
// 	afterAll(() => {
// 		host.sendMessage.resolves();
// 		node.destroy();
// 	});

// 	test("should send a HumidityControlOperatingStateCC.Get", async (t) => {
// 		node.addCC(CommandClasses["Humidity Control Operating State"], {
// 			isSupported: true,
// 		});
// 		const cc = node.createCCInstance(
// 			CommandClasses["Humidity Control Operating State"],
// 		)!;
// 		await cc.interview(host);

// 		sinon.assert.called(host.sendMessage);

// 		assertCC(t, host.sendMessage.mock.calls[0][0], {
// 			cc: HumidityControlOperatingStateCC,
// 			nodeId: node.id,
// 			ccValues: {
// 				ccCommand: HumidityControlOperatingStateCommand.Get,
// 			},
// 		});
// 	});
// });
