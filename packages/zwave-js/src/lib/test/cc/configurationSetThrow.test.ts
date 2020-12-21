import { CommandClasses } from "@zwave-js/core";
import type { Driver } from "../../driver/Driver";
import { ZWaveNode } from "../../node/Node";
import { createAndStartDriver } from "../utils";

// repro from https://github.com/zwave-js/zwavejs2mqtt/issues/101#issuecomment-749007701

describe("regression tests", () => {
	let driver: Driver;
	process.env.LOGLEVEL = "debug";

	beforeEach(async () => {
		({ driver } = await createAndStartDriver());

		driver["_controller"] = {
			ownNodeId: 1,
			isFunctionSupported: () => true,
			nodes: new Map(),
		} as any;
	});

	afterEach(async () => {
		await driver.destroy();
		driver.removeAllListeners();
	});

	it("trying to send a ConfigurationCC::Set with invalid value should throw immediately", async () => {
		const node2 = new ZWaveNode(2, driver);
		node2.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
		});
		(driver.controller.nodes as Map<number, ZWaveNode>).set(2, node2);

		const spy = jest.fn();
		driver.on("error", spy);

		const promise = node2.commandClasses.Configuration.setValue!(
			{
				property: 2,
			},
			"not-a-number",
		);

		expect(spy).not.toBeCalled();
		await expect(promise).toReject();
	});
});
