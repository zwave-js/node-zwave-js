import { CommandClasses } from "@zwave-js/core";
import { createTestingHost } from "@zwave-js/host";
import { ZWaveNode } from "../../lib/node/Node";
import type { Driver } from "../driver/Driver";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { CommandClass, getCommandClass } from "./CommandClass";
import {
	ManufacturerSpecificCC,
	ManufacturerSpecificCCGet,
} from "./ManufacturerSpecificCC";

const host = createTestingHost();

describe("lib/commandclass/ManufacturerSpecificCC => ", () => {
	const cc = new ManufacturerSpecificCCGet(host, { nodeId: 2 });
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
		const deserialized = CommandClass.from(host, {
			nodeId: cc.nodeId as number,
			data: serialized,
		});
		expect(deserialized).toBeInstanceOf(ManufacturerSpecificCC);
		expect(deserialized.nodeId).toBe(cc.nodeId);
	});

	describe.skip(`interview()`, () => {
		const driver = createEmptyMockDriver();
		const node = new ZWaveNode(2, driver as unknown as Driver);
		let cc: ManufacturerSpecificCC;

		function doInterview() {
			return cc.interview(driver);
		}
		function resetSendMessageImplementation() {
			driver.sendMessage.mockImplementation(() =>
				Promise.resolve({ command: {} }),
			);
		}

		beforeAll(
			async () => {
				await driver.configManager.loadManufacturers();

				resetSendMessageImplementation();
				driver.controller.nodes.set(node.id, node);
				node.addCC(CommandClasses["Manufacturer Specific"], {
					isSupported: true,
				});
				cc = node.createCCInstance(ManufacturerSpecificCC)!;
			},
			// Loading configuration may take a while on CI
			30000,
		);

		beforeEach(() => driver.sendMessage.mockClear());
		afterAll(() => {
			driver.sendMessage.mockImplementation(() => Promise.resolve());
			node.destroy();
		});

		it("should not send anything if the node is the controller", async () => {
			// Temporarily make this node the controller node
			driver.controller.ownNodeId = node.id;
			await doInterview();
			expect(driver.sendMessage).not.toBeCalled();
			driver.controller.ownNodeId = 1;
		});

		it("should send a ManufacturerSpecificCC.Get", async () => {
			driver.sendMessage.mockImplementation(() =>
				Promise.resolve({
					command: {
						manufacturerId: 0xffff,
						productType: 0x00,
						productId: 0x00,
					},
				}),
			);
			await doInterview();

			expect(driver.sendMessage).toBeCalled();

			assertCC(driver.sendMessage.mock.calls[0][0], {
				cc: ManufacturerSpecificCCGet,
				nodeId: node.id,
			});
		});
	});
});
