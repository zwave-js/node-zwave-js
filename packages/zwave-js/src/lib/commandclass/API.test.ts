import { MockController, MockNode } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { ZWaveNode } from "../node/Node";
import { CCAPI } from "./API";
import { API } from "./CommandClass";

@API(0xff)
export class DummyCCAPI extends CCAPI {}

describe("lib/commandclass/CommandClass", () => {
	let driver: Driver;
	let node2: ZWaveNode;
	let controller: MockController;

	afterAll(async () => {
		({ driver } = await createAndStartTestingDriver({
			skipNodeInterview: true,
			loadConfiguration: false,
			beforeStartup(mockPort) {
				controller = new MockController({ serial: mockPort });
				controller.defineBehavior(
					...createDefaultMockControllerBehaviors(),
				);
				const node2 = new MockNode({
					id: 2,
					controller,
				});
				controller.nodes.set(node2.id, node2);
			},
		}));
		node2 = new ZWaveNode(2, driver);
		(driver.controller.nodes as any as Map<any, any>).set(node2.id, node2);
	}, 30000);

	afterAll(async () => {
		await driver.destroy();
	});

	describe("supportsCommand()", () => {
		it(`returns "unknown" by default`, () => {
			const API = new DummyCCAPI(driver, node2);
			expect(API.supportsCommand(null as any)).toBe("unknown");
		});
	});
});
