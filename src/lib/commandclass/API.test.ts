import { createEmptyMockDriver } from "../../../test/mocks";
import type { IDriver } from "../driver/IDriver";
import { ZWaveNode } from "../node/Node";
import { CCAPI } from "./API";
import { API } from "./CommandClass";

const fakeDriver = (createEmptyMockDriver() as unknown) as IDriver;
const node = new ZWaveNode(1, fakeDriver as any);
(fakeDriver.controller!.nodes as any).set(node.id, node);

@API(0xff)
export class DummyCCAPI extends CCAPI { }

describe("lib/commandclass/CommandClass => ", () => {
	describe("supportsCommand()", () => {
		it(`returns "unknown" by default`, () => {
			const API = new DummyCCAPI(fakeDriver, node);
			expect(API.supportsCommand(null as any)).toBe("unknown");
		});
	});
});
