import { CommandClasses } from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../../Utils";
import type { Driver } from "../../driver/Driver";
import { createAndStartTestingDriver } from "../../driver/DriverMock";
import { ZWaveNode } from "../../node/Node";

// repro from https://github.com/zwave-js/zwavejs2mqtt/issues/101#issuecomment-749007701

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

		node2.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("trying to send a ConfigurationCC::Set with invalid value should throw immediately", async () => {
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
