import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

describe("regression tests", () => {
	let driver: Driver;
	let node2: ZWaveNode;
	let controller: MockController;

	beforeAll(async () => {
		({ driver } = await createAndStartTestingDriver({
			skipNodeInterview: true,
			loadConfiguration: false,
			beforeStartup(mockPort) {
				controller = new MockController({ serial: mockPort });
				controller.defineBehavior(
					...createDefaultMockControllerBehaviors(),
				);
			},
		}));
		node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node2.id,
			node2,
		);

		node2.addCC(CommandClasses["Scene Activation"], {
			isControlled: true,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("a node that controls the Scene Activation CC should include the scene ID in getDefinedValueIDs()", async () => {
		const valueIDs = node2.getDefinedValueIDs();
		expect(valueIDs.some((v) => v.property === "sceneId")).toBeTrue();
	});
});
