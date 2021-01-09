import { CommandClasses } from "@zwave-js/core";
import { ZWaveNode } from "../../lib/node/Node";
import type { Driver } from "../driver/Driver";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { CommandClass, getCommandClass } from "./CommandClass";
import {
	ManufacturerSpecificCC,
	ManufacturerSpecificCCGet,
} from "./ManufacturerSpecificCC";

const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

describe("lib/commandclass/ManufacturerSpecificCC => ", () => {
	const cc = new ManufacturerSpecificCCGet(fakeDriver, { nodeId: 2 });
	let serialized: Buffer;

	it("should be a CommandClass", () => {
		expect(cc).toBeInstanceOf(CommandClass);
	});
	it(`with command class "Manufacturer Specific"`, () => {
		expect(getCommandClass(cc)).toBe(
			CommandClasses["Manufacturer Specific"],
		);
	});

	it("should serialize correctly", () => {
		serialized = cc.serialize();
		expect(serialized).toEqual(Buffer.from("7204", "hex"));
	});

	it("should deserialize correctly", () => {
		const deserialized = CommandClass.from(fakeDriver, {
			nodeId: cc.nodeId as number,
			data: serialized,
		});
		expect(deserialized).toBeInstanceOf(ManufacturerSpecificCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});

	describe(`interview()`, () => {
		const fakeDriver = createEmptyMockDriver();
		const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
		let cc: ManufacturerSpecificCC;

		function doInterview() {
			return cc.interview();
		}
		function resetSendMessageImplementation() {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
		}

		beforeAll(async () => {
			await fakeDriver.configManager.loadManufacturers();
			resetSendMessageImplementation();
			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses["Manufacturer Specific"], {
				isSupported: true,
			});
			cc = node.createCCInstance(ManufacturerSpecificCC)!;
		});
		beforeEach(() => fakeDriver.sendMessage.mockClear());
		afterAll(() => {
			fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should not send anything if the node is the controller", async () => {
			// Temporarily make this node the controller node
			fakeDriver.controller.ownNodeId = node.id;
			await doInterview();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			fakeDriver.controller.ownNodeId = 1;
		});

		it("should send a ManufacturerSpecificCC.Get", async () => {
			fakeDriver.sendMessage.mockImplementation(() =>
				Promise.resolve({
					command: {
						manufacturerId: 0xffff,
						productType: 0x00,
						productId: 0x00,
					},
				}),
			);
			await doInterview();

			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: ManufacturerSpecificCCGet,
				nodeId: node.id,
			});
		});
	});
});
