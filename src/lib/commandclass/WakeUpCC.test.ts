import { createEmptyMockDriver } from "../../../test/mocks";
import { assertCC } from "../../../test/util";
import { Driver } from "../driver/Driver";
import { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import { CommandClass, getCommandClass } from "./CommandClass";
import { CommandClasses } from "./CommandClasses";
import { WakeUpCC, WakeUpCCIntervalCapabilitiesGet } from "./WakeUpCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;

describe("lib/commandclass/WakeUpCC => ", () => {
	const cc = new WakeUpCC(fakeDriver, { nodeId: 9 });

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Wake Up"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["Wake Up"]);
	});

	it.todo(
		"should serialize correctly" /*, () => {
		const req = new SendDataRequest(fakeDriver, {
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
	}*/,
	);

	describe(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
		let cc: WakeUpCC;

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			node.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
			});
			fakeDriver.controller.nodes.set(node.id, node);
			cc = node.createCCInstance<WakeUpCC>(CommandClasses["Wake Up"])!;
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
		});

		it("should not send anything if the node is the controller", async () => {
			// Temporarily make this node the controller node
			fakeDriver.controller.ownNodeId = node.id;
			await cc.interview();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			fakeDriver.controller.ownNodeId = 1;
		});

		it("should not send anything if the node is frequent listening", async () => {
			// Temporarily make this node frequent listening
			(node as any)._isFrequentListening = true;
			await cc.interview();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			(node as any)._isFrequentListening = false;
		});

		it.skip("if the node is V2+, it should send a WakeUpCCIntervalCapabilitiesGet", async () => {
			// TODO: Provide a correct response
			await cc.interview();
			expect(fakeDriver.sendMessage).toBeCalled();
			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				nodeId: node.id,
				cc: WakeUpCCIntervalCapabilitiesGet,
			});
		});

		it.todo(
			"it should send a WakeUpCCIntervalGet, followed by a WakeUpCCIntervalSet with the controller ID",
		);
	});
});
