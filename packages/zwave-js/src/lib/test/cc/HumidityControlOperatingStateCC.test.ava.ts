import {
	HumidityControlOperatingState,
	HumidityControlOperatingStateCCGet,
	HumidityControlOperatingStateCCReport,
	HumidityControlOperatingStateCommand,
} from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Humidity Control Operating State"], // CC
		]),
		payload,
	]);
}

test("the Get command should serialize correctly", (t) => {
	const cc = new HumidityControlOperatingStateCCGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			HumidityControlOperatingStateCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
});

test("the Report command should be deserialized correctly", (t) => {
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

	t.is(cc.state, HumidityControlOperatingState.Humidifying);
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
// 	const host = createEmptyMockDriverAva();
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

// 		assertCCAva(t, host.sendMessage.mock.calls[0][0], {
// 			cc: HumidityControlOperatingStateCC,
// 			nodeId: node.id,
// 			ccValues: {
// 				ccCommand: HumidityControlOperatingStateCommand.Get,
// 			},
// 		});
// 	});
// });
