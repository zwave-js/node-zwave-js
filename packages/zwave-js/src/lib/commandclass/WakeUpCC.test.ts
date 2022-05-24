import {
	CommandClasses,
	generateAuthKey,
	generateEncryptionKey,
} from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { randomBytes } from "crypto";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { CommandClass, getCommandClass } from "./CommandClass";
import { MultiChannelCC } from "./MultiChannelCC";
import { SecurityCC } from "./SecurityCC";
import {
	WakeUpCC,
	WakeUpCCIntervalCapabilitiesGet,
	WakeUpCCNoMoreInformation,
} from "./WakeUpCC";

const host = createTestingHost();

describe("lib/commandclass/WakeUpCC => ", () => {
	const cc = new WakeUpCC(host, { nodeId: 9 });

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Wake Up"`, () => {
		expect(getCommandClass(cc)).toBe(CommandClasses["Wake Up"]);
	});

	it.todo(
		"should serialize correctly" /*, () => {
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
	}*/,
	);

	describe.skip(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
		let cc: WakeUpCC;

		beforeAll(() => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
			node.addCC(CommandClasses["Wake Up"], {
				isSupported: true,
			});
			fakeDriver.controller.nodes.set(node.id, node);
			cc = node.createCCInstance(WakeUpCC)!;
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should not send anything if the node is the controller", async () => {
			// Temporarily make this node the controller node
			fakeDriver.controller.ownNodeId = node.id;
			await cc.interview(fakeDriver);
			expect(fakeDriver.sendMessage).not.toBeCalled();
			fakeDriver.controller.ownNodeId = 1;
		});

		it("should not send anything if the node is frequent listening", async () => {
			// Temporarily make this node frequent listening
			(node as any)["isFrequentListening"] = true;
			await cc.interview(fakeDriver);
			expect(fakeDriver.sendMessage).not.toBeCalled();
			(node as any)["isFrequentListening"] = false;
		});

		it.skip("if the node is V2+, it should send a WakeUpCCIntervalCapabilitiesGet", async () => {
			// TODO: Provide a correct response
			await cc.interview(fakeDriver);
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

	describe("responses should be detected correctly", () => {
		it("WakeUpCCNoMoreInformation should expect no response", () => {
			const cc = new WakeUpCCNoMoreInformation(host, {
				nodeId: 2,
				endpoint: 2,
			});
			expect(cc.expectsCCResponse()).toBeFalse();
		});

		it("MultiChannelCC/WakeUpCCNoMoreInformation should expect NO response", () => {
			const ccRequest = MultiChannelCC.encapsulate(
				host,
				new WakeUpCCNoMoreInformation(host, {
					nodeId: 2,
					endpoint: 2,
				}),
			);
			expect(ccRequest.expectsCCResponse()).toBeFalse();
		});

		it("SecurityCC/WakeUpCCNoMoreInformation should expect NO response", () => {
			// The nonce needed to decode it
			const nonce = randomBytes(8);
			// The network key needed to decode it
			const networkKey = Buffer.from(
				"0102030405060708090a0b0c0d0e0f10",
				"hex",
			);

			const securityManager = {
				getNonce: () => nonce,
				authKey: generateAuthKey(networkKey),
				encryptionKey: generateEncryptionKey(networkKey),
			};

			const ccRequest = SecurityCC.encapsulate(
				{
					...host,
					securityManager,
				} as any,
				new WakeUpCCNoMoreInformation(host, {
					nodeId: 2,
					endpoint: 2,
				}),
			);
			expect(ccRequest.expectsCCResponse()).toBeFalse();
		});
	});
});
