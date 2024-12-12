import "@zwave-js/cc";
import { BatteryCCAPI } from "@zwave-js/cc/BatteryCC";
import { VersionCCAPI } from "@zwave-js/cc/VersionCC";
import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import { MockController } from "@zwave-js/testing";
import { afterEach, test as baseTest } from "vitest";
import { createDefaultMockControllerBehaviors } from "../../Testing.js";
import type { Driver } from "../driver/Driver.js";
import { createAndStartTestingDriver } from "../driver/DriverMock.js";
import { Endpoint } from "./Endpoint.js";
import { ZWaveNode } from "./Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver } = await createAndStartTestingDriver({
				skipNodeInterview: true,
				loadConfiguration: false,
				beforeStartup(mockPort, serial) {
					const controller = new MockController({
						mockPort,
						serial,
					});
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					context.controller = controller;
				},
			});
			context.driver = driver;

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

afterEach<LocalTestContext>(({ context, expect }) => {
	const { driver } = context;
	driver.networkCache.clear();
	driver.valueDB?.clear();
});

test.sequential(
	"createAPI() throws if a non-implemented API should be created",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);

		assertZWaveError(expect, () => endpoint.createAPI(0xbada55), {
			errorCode: ZWaveErrorCodes.CC_NoAPI,
			messageMatches: "no associated API",
		});
	},
);

test.sequential(
	"The API returned from createAPI() throws when trying to access a non-supported CC",
	async ({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		// We must not use Basic CC here, because that is assumed to be always supported
		const api = endpoint.createAPI(CommandClasses["Binary Sensor"]);

		// this does not throw
		api.isSupported();
		// this does
		await assertZWaveError(expect, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: /Node 1 \(endpoint 1\) does not support/,
		});

		// It only includes the endpoint number for non-root endpoints
		(endpoint as any).index = 0;
		await assertZWaveError(expect, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: "Node 1 does not support",
		});
	},
);

test.sequential(
	"The commandClasses dictionary throws when trying to access a non-implemented CC",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		assertZWaveError(
			expect,
			() => (endpoint.commandClasses as any).FOOBAR,
			{
				errorCode: ZWaveErrorCodes.CC_NotImplemented,
				messageMatches: "FOOBAR is not implemented",
			},
		);
	},
);

test.sequential(
	"The commandClasses dictionary throws when trying to use a command of an unsupported CC",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		assertZWaveError(
			expect,
			() => endpoint.commandClasses.Battery.get(),
			{
				errorCode: ZWaveErrorCodes.CC_NotSupported,
				messageMatches: "does not support the Command Class Battery",
			},
		);
	},
);

test.sequential(
	"The commandClasses dictionary does not throw when checking support of a CC",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		expect(endpoint.commandClasses.Battery.isSupported()).toBe(false);
	},
);

test.sequential(
	"The commandClasses dictionary does not throw when accessing the ID of a CC",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		expect(endpoint.commandClasses.Battery.ccId).toBe(
			CommandClasses.Battery,
		);
	},
);

test.sequential(
	"The commandClasses dictionary does not throw when scoping the API options",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		expect(() => endpoint.commandClasses.Battery.withOptions({})).not
			.toThrow();
	},
);

test.sequential(
	"The commandClasses dictionary returns all supported CCs when being enumerated",
	({ context, expect }) => {
		const { driver } = context;
		// No supported CCs, empty array
		let node = new ZWaveNode(2, driver, undefined, []);
		let actual = [...node.commandClasses];
		expect(actual).toStrictEqual([]);

		// Supported and controlled CCs
		node = new ZWaveNode(
			2,
			driver,
			undefined,
			[CommandClasses.Battery, CommandClasses.Version],
			[CommandClasses["Wake Up"]],
		);
		actual = [...node.commandClasses];
		expect(actual.length).toBe(2);
		expect(
			actual.map((api) => api.constructor),
		).toStrictEqual([
			BatteryCCAPI,
			VersionCCAPI,
			// WakeUpCCAPI is not supported (only controlled), so no API!
		]);
		node.destroy();
	},
);

test.sequential(
	"The commandClasses dictionary returns [object Object] when turned into a string",
	({ context, expect }) => {
		const { driver } = context;
		const node = new ZWaveNode(2, driver, undefined, []);
		expect(
			(node.commandClasses as any)[Symbol.toStringTag],
		).toBe("[object Object]");
		node.destroy();
	},
);

test.sequential(
	"The commandClasses dictionary returns undefined for other symbol properties",
	({ context, expect }) => {
		const { driver } = context;
		const node = new ZWaveNode(2, driver, undefined, []);
		expect((node.commandClasses as any)[Symbol.unscopables])
			.toBeUndefined();
		node.destroy();
	},
);

test.sequential(
	"createCCInstance() returns undefined if the node supports the CC but it is not yet implemented",
	({ context, expect }) => {
		const { driver } = context;
		const endpoint = new Endpoint(1, driver, 1);
		const cc = 0xbada55;
		endpoint.addCC(cc, { isSupported: true });
		const instance = endpoint.createCCInstance(cc);
		expect(instance).toBeUndefined();
	},
);
