import { ZWavePlusCCGet, ZWavePlusCommand } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared/safe";
import { test } from "vitest";

function buildCCBuffer(payload: Uint8Array): Uint8Array {
	return Bytes.concat([
		Uint8Array.from([
			CommandClasses["Z-Wave Plus Info"], // CC
		]),
		payload,
	]);
}

test("The Get command should serialize correctly", async (t) => {
	const cc = new ZWavePlusCCGet({
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Uint8Array.from([
			ZWavePlusCommand.Get, // CC Command
		]),
	);
	await t.expect(cc.serialize({} as any)).resolves.toStrictEqual(
		expected,
	);
});

// describe.skip(`interview()`, () => {
// 	const fakeDriver = createEmptyMockDriver();
// 	const node = new ZWaveNode(2, fakeDriver as unknown as Driver);

// 	beforeAll(() => {
// 		fakeDriver.sendMessage.mockImplementation(() =>
// 			Promise.resolve({ command: {} }),
// 		);
// 		fakeDriver.controller.nodes.set(node.id, node);
// 	});
// 	beforeEach(() => fakeDriver.sendMessage.mockClear());
// 	afterAll(() => {
// 		fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
// 		node.destroy();
// 	});

// 	test("should send a ZWavePlusCC.Get", async (t) => {
// 		node.addCC(CommandClasses["Z-Wave Plus Info"], {
// 			isSupported: true,
// 		});
// 		const cc = node.createCCInstance(
// 			CommandClasses["Z-Wave Plus Info"],
// 		)!;
// 		await cc.interview(fakeDriver);

// 		sinon.assert.called(fakeDriver.sendMessage);

// 		assertCC(t, fakeDriver.sendMessage.mock.calls[0][0], {
// 			cc: ZWavePlusCC,
// 			nodeId: node.id,
// 			ccValues: {
// 				ccCommand: ZWavePlusCommand.Get,
// 			},
// 		});
// 	});

// 	it.todo("Test the behavior when the request failed");

// 	it.todo("Test the behavior when the request succeeds");
// });
