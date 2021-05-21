import { ConfigManager } from "@zwave-js/config";
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
import { DeviceClass } from "./DeviceClass";
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
			assertZWaveError(() => (endpoint.commandClasses as any).FOOBAR, {
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
			node.destroy();
		});

		it("returns [object Object] when turned into a string", () => {
			const node = new ZWaveNode(2, fakeDriver, undefined, []);
			expect((node.commandClasses as any)[Symbol.toStringTag]).toBe(
				"[object Object]",
			);
			node.destroy();
		});

		it("returns undefined for other symbol properties", () => {
			const node = new ZWaveNode(2, fakeDriver, undefined, []);
			expect(
				(node.commandClasses as any)[Symbol.unscopables],
			).toBeUndefined();
			node.destroy();
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

	describe("Device Class quirks", () => {
		it("A non-root endpoint with the `Power Strip Switch` device class does not support the Multi Channel CC", async () => {
			const cm = new ConfigManager();
			await cm.loadDeviceClasses();
			const powerStripSwitch = new DeviceClass(cm, 0x01, 0x10, 0x04);

			const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

			const node = new ZWaveNode(1, fakeDriver, powerStripSwitch);
			expect(node.supportsCC(CommandClasses["Multi Channel"])).toBeTrue();
			const ep = new Endpoint(1, fakeDriver, 1, powerStripSwitch);
			expect(ep.supportsCC(CommandClasses["Multi Channel"])).toBeFalse();
		});

		it("Non-root endpoints should not have the Manufacturer Specific CC (among others) added as mandatory", async () => {
			const cm = new ConfigManager();
			await cm.loadDeviceClasses();
			const soundSwitch = new DeviceClass(cm, 0x01, 0x03, 0x01);

			const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
			const node = new ZWaveNode(1, fakeDriver, soundSwitch);
			(fakeDriver.controller.nodes as any).set(1, node);

			expect(
				node.supportsCC(CommandClasses["Manufacturer Specific"]),
			).toBeTrue();
			const ep = new Endpoint(1, fakeDriver, 1, soundSwitch);
			expect(
				ep.supportsCC(CommandClasses["Manufacturer Specific"]),
			).toBeFalse();
		});

		it("Always-listening nodes should not have the Battery CC added as mandatory", async () => {
			const cm = new ConfigManager();
			await cm.loadDeviceClasses();
			const soundSwitch = new DeviceClass(cm, 0x01, 0x03, 0x01);

			const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;
			const node = new ZWaveNode(1, fakeDriver);
			(fakeDriver.controller.nodes as any).set(1, node);
			node["_isListening"] = true;
			node["applyDeviceClass"](soundSwitch);

			expect(node.supportsCC(CommandClasses.Battery)).toBeFalse();
			const ep = new Endpoint(1, fakeDriver, 1, soundSwitch);
			expect(ep.supportsCC(CommandClasses.Battery)).toBeFalse();
		});
	});
});
