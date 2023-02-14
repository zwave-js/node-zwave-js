import { ZWavePlusCCGet, ZWavePlusCommand } from "@zwave-js/cc";
import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import test from "ava";

const host = createTestingHost();

function buildCCBuffer(payload: Buffer): Buffer {
	return Buffer.concat([
		Buffer.from([
			CommandClasses["Z-Wave Plus Info"], // CC
		]),
		payload,
	]);
}

test("The Get command should serialize correctly", (t) => {
	const cc = new ZWavePlusCCGet(host, {
		nodeId: 1,
	});
	const expected = buildCCBuffer(
		Buffer.from([
			ZWavePlusCommand.Get, // CC Command
		]),
	);
	t.deepEqual(cc.serialize(), expected);
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

// 		assertCCAva(t, fakeDriver.sendMessage.mock.calls[0][0], {
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
