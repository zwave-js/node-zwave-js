import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import { CCAPI } from "./API";
import { API } from "./CommandClass";

@API(0xff)
export class DummyCCAPI extends CCAPI {}

describe("lib/commandclass/CommandClass => ", () => {
	let fakeDriver: Driver;
	let node: ZWaveNode;

	beforeAll(() => {
		fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
		node = new ZWaveNode(1, fakeDriver as any);
		(fakeDriver.controller.nodes as any).set(node.id, node);
	});

	afterAll(() => {
		node.destroy();
	});

	describe("supportsCommand()", () => {
		it(`returns "unknown" by default`, () => {
			const API = new DummyCCAPI(fakeDriver, node);
			expect(API.supportsCommand(null as any)).toBe("unknown");
		});
	});
});
