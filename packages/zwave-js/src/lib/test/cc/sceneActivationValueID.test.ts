import { CommandClasses } from "@zwave-js/core";
import { createThrowingMap, ThrowingMap } from "@zwave-js/shared";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

describe("regression tests", () => {
	let driver: Driver;

	beforeEach(async () => {
		({ driver } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: () => true,
			nodes: createThrowingMap(),
			incrementStatistics: () => {},
			removeAllListeners: () => {},
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("a node that controls the Scene Activation CC should include the scene ID in getDefinedValueIDs()", async () => {
		const node2 = new ZWaveNode(2, driver);
		node2.addCC(CommandClasses["Scene Activation"], {
			isControlled: true,
		});
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			2,
			node2,
		);

		const valueIDs = node2.getDefinedValueIDs();
		expect(valueIDs.some((v) => v.property === "sceneId")).toBeTrue();
	});
});
