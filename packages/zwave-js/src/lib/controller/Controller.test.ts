import { assertZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import { ZWaveNode } from "../node/Node";
import { createEmptyMockDriver } from "../test/mocks";
import { ZWaveController } from "./Controller";

describe("lib/controller/Controller", () => {
	describe("nodes.getOrThrow()", () => {
		let fakeDriver: Driver;
		beforeAll(() => {
			fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
			fakeDriver.registerRequestHandler = () => {};
		});

		it("should return a node if it was found", () => {
			const ctrl = new ZWaveController(fakeDriver);
			ctrl["_nodes"].set(1, new ZWaveNode(1, fakeDriver));
			expect(() => ctrl.nodes.getOrThrow(1)).not.toThrow();
		});

		it("should throw if the node was not found", () => {
			const ctrl = new ZWaveController(fakeDriver);
			assertZWaveError(() => ctrl.nodes.getOrThrow(1), {
				errorCode: ZWaveErrorCodes.Controller_NodeNotFound,
			});
		});
	});
});
