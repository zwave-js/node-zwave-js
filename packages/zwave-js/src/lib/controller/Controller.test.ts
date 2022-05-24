import {
	assertZWaveError,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import { getGroupCountValueId } from "../commandclass/AssociationCC";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import { ZWaveController } from "./Controller";

describe("lib/controller/Controller", () => {
	describe("nodes.getOrThrow()", () => {
		let driver: Driver;
		let controller: MockController;

		beforeAll(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
				},
			}));
		}, 30000);

		afterAll(async () => {
			await driver.destroy();
		});

		it("should return a node if it was found", () => {
			const node2 = new ZWaveNode(2, driver);
			(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
				node2.id,
				node2,
			);
			expect(() => driver.controller.nodes.getOrThrow(2)).not.toThrow();
		});

		it("should throw if the node was not found", () => {
			assertZWaveError(() => driver.controller.nodes.getOrThrow(3), {
				errorCode: ZWaveErrorCodes.Controller_NodeNotFound,
			});
		});
	});

	describe("getAssociationGroups()", () => {
		let fakeDriver: Driver;
		beforeAll(async () => {
			fakeDriver = createEmptyMockDriver() as unknown as Driver;
			fakeDriver.registerRequestHandler = () => {};
			await fakeDriver.configManager.loadAll();
		}, 60000);

		it("should respect the endpoint definition format when AGI is supported", async () => {
			const ctrl = new ZWaveController(fakeDriver);
			ctrl["_nodes"].set(1, new ZWaveNode(1, fakeDriver));
			(fakeDriver as any).controller = ctrl;
			const node1 = ctrl.nodes.getOrThrow(1);
			node1.addCC(CommandClasses.Association, {
				isSupported: true,
				version: 3,
			});
			node1.addCC(CommandClasses["Association Group Information"], {
				isSupported: true,
				version: 3,
			});
			node1.valueDB.setValue(getGroupCountValueId(0), 14);
			node1["_deviceConfig"] =
				await fakeDriver.configManager.lookupDevice(
					// Logic Group ZDB5100
					0x0234,
					0x0003,
					0x0121,
					"0.0",
				);

			expect(
				ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)
					?.label,
			).toBe("Button 1 (Multilevel Set)");
		});

		it("should respect the endpoint definition format when AGI is not supported", async () => {
			const ctrl = new ZWaveController(fakeDriver);
			ctrl["_nodes"].set(1, new ZWaveNode(1, fakeDriver));
			(fakeDriver as any).controller = ctrl;
			const node1 = ctrl.nodes.getOrThrow(1);
			node1.addCC(CommandClasses.Association, {
				isSupported: true,
				version: 3,
			});
			node1.valueDB.setValue(getGroupCountValueId(0), 14);
			node1["_deviceConfig"] =
				await fakeDriver.configManager.lookupDevice(
					// Logic Group ZDB5100
					0x0234,
					0x0003,
					0x0121,
					"0.0",
				);

			expect(
				ctrl.getAssociationGroups({ nodeId: 1, endpoint: 0 }).get(4)
					?.label,
			).toBe("Button 1 (Multilevel Set)");
		});
	});
});
