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
	let node: ZWaveNode;
	let controller: MockController;

	beforeAll(async () => {
		({ driver } = await createAndStartTestingDriver({
			skipNodeInterview: true,
			beforeStartup(mockPort) {
				controller = new MockController({ serial: mockPort });
				controller.defineBehavior(
					...createDefaultMockControllerBehaviors(),
				);
			},
		}));
		node = new ZWaveNode(84, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			node.id,
			node,
		);

		node.addCC(CommandClasses.Configuration, {
			isSupported: true,
			version: 1,
		});
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	it("When receiving a MeterCC::Report, the value event should contain the meter name in propertyKeyName", async () => {
		const valueAddedPromise = new Promise<void>((resolve) => {
			node.on("value added", (_node, args) => {
				expect(args.propertyKeyName).toBe("Electric_kWh_Consumed");
				resolve();
			});
		});

		await Promise.all([
			valueAddedPromise,
			controller.sendToHost(
				Buffer.from(
					"0116000400540e3202214400013707012d00013707d5001b",
					"hex",
				),
			),
		]);
	});
});
