import {
	assertZWaveError,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { BatteryCCAPI } from "../commandclass/BatteryCC";
import type { BinarySensorCCAPI } from "../commandclass/BinarySensorCC";
import "../commandclass/index";
import { VersionCCAPI } from "../commandclass/VersionCC";
import type { Driver } from "../driver/Driver";
import { createEmptyMockDriver } from "../test/mocks";
import { Endpoint } from "./Endpoint";
import { ZWaveNode } from "./Node";

describe("lib/node/Endpoint", () => {
	describe("createAPI", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
		it("throws if a non-implemented API should be created", () => {
			const endpoint = new Endpoint(1, fakeDriver, 1);

			assertZWaveError(() => endpoint.createAPI(0xbada55), {
				errorCode: ZWaveErrorCodes.CC_NoAPI,
				messageMatches: "no associated API",
			});
		});

		it("the returned API throws when trying to access a non-supported CC", async () => {
			const endpoint = new Endpoint(1, fakeDriver, 1);
			// We must not use Basic CC here, because that is assumed to be always supported
			const api = endpoint.createAPI(
				CommandClasses["Binary Sensor"],
			) as BinarySensorCCAPI;

			// this does not throw
			api.isSupported();
			// this does
			await assertZWaveError(() => api.get(), {
				errorCode: ZWaveErrorCodes.CC_NotSupported,
				messageMatches: "Node 1 (endpoint 1) does not support",
			});

			// It only includes the endpoint number for non-root endpoints
			(endpoint as any).index = 0;
			await assertZWaveError(() => api.get(), {
				errorCode: ZWaveErrorCodes.CC_NotSupported,
				messageMatches: "Node 1 does not support",
			});
		});
	});

	describe("commandClasses dictionary", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
		it("throws when trying to access a non-implemented CC", () => {
			const endpoint = new Endpoint(1, fakeDriver, 1);
			assertZWaveError(() => (endpoint.commandClasses as any)["FOOBAR"], {
				errorCode: ZWaveErrorCodes.CC_NotImplemented,
				messageMatches: "FOOBAR is not implemented",
			});
		});

		it("returns all supported CCs when being enumerated", () => {
			// No supported CCs, empty array
			let node = new ZWaveNode(2, fakeDriver, undefined, []);
			let actual = [...node.commandClasses];
			expect(actual).toEqual([]);

			// Supported and controlled CCs
			node = new ZWaveNode(
				2,
				fakeDriver,
				undefined,
				[CommandClasses.Battery, CommandClasses.Version],
				[CommandClasses["Wake Up"]],
			);
			actual = [...node.commandClasses];
			expect(actual).toHaveLength(2);
			expect(actual.map((api) => api.constructor)).toIncludeAllMembers([
				BatteryCCAPI,
				VersionCCAPI,
				// WakeUpCCAPI is not supported (only controlled), so no API!
			]);
		});

		it("returns [object Object] when turned into a string", () => {
			const node = new ZWaveNode(2, fakeDriver, undefined, []);
			expect((node.commandClasses as any)[Symbol.toStringTag]).toBe(
				"[object Object]",
			);
		});

		it("returns undefined for other symbol properties", () => {
			const node = new ZWaveNode(2, fakeDriver, undefined, []);
			expect(
				(node.commandClasses as any)[Symbol.unscopables],
			).toBeUndefined();
		});
	});

	describe("createCCInstance()", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

		it("returns undefined if the node supports the CC but it is not yet implemented", () => {
			const endpoint = new Endpoint(1, fakeDriver, 1);
			const cc = 0xbada55;
			endpoint.addCC(cc, { isSupported: true });
			const instance = endpoint.createCCInstance(cc);
			expect(instance).toBeUndefined();
		});
	});
});
