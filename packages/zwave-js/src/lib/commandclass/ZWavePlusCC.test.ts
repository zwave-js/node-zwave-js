import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { TransmitOptions } from "../controller/_Types";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { CommandClass, getCommandClass } from "./CommandClass";
import { ZWavePlusCC } from "./ZWavePlusCC";
import { ZWavePlusCommand } from "./_Types";

const host = createTestingHost();

describe("lib/commandclass/ZWavePlusCC => ", () => {
	const cc = new ZWavePlusCC(host, { nodeId: 9 });
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Z-Wave Plus Info"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["Z-Wave Plus Info"]);
	});

	it("should serialize correctly", () => {
		const req = new SendDataRequest(host, {
			command: cc,
			transmitOptions: TransmitOptions.DEFAULT,
			callbackId: 36,
		});
		cc.ccCommand = ZWavePlusCommand.Get;
		serialized = req.serialize();
		// A real message from OZW
		expect(serialized).toEqual(
			Buffer.from("0109001309025e012524b0", "hex"),
		);
	});

	describe.skip(`interview()`, () => {
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

		it("should send a ZWavePlusCC.Get", async () => {
			node.addCC(CommandClasses["Z-Wave Plus Info"], {
				isSupported: true,
			});
			const cc = node.createCCInstance(
				CommandClasses["Z-Wave Plus Info"],
			)!;
			await cc.interview(fakeDriver);

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: ZWavePlusCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: ZWavePlusCommand.Get,
				},
			});
		});

		it.todo("Test the behavior when the request failed");

		it.todo("Test the behavior when the request succeeds");
	});
});
