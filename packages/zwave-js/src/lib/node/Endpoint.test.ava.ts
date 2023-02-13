import "@zwave-js/cc";
import { BatteryCCAPI } from "@zwave-js/cc/BatteryCC";
import { VersionCCAPI } from "@zwave-js/cc/VersionCC";
import {
	assertZWaveErrorAva,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import ava, { TestFn } from "ava";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { DeviceClass } from "./DeviceClass";
import { Endpoint } from "./Endpoint";
import { ZWaveNode } from "./Node";

interface TestContext {
	driver: Driver;
	controller: MockController;
}

const test = ava as TestFn<TestContext>;

test.before(async (t) => {
	t.timeout(30000);

	const { driver } = await createAndStartTestingDriver({
		skipNodeInterview: true,
		loadConfiguration: false,
		beforeStartup(mockPort) {
			const controller = new MockController({ serial: mockPort });
			controller.defineBehavior(
				...createDefaultMockControllerBehaviors(),
			);
			t.context.controller = controller;
		},
	});
	await driver.configManager.loadDeviceClasses();
	t.context.driver = driver;
});

test.after.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
});

test.afterEach((t) => {
	const { driver } = t.context;
	driver.networkCache.clear();
	driver.valueDB?.clear();
});

test.serial(
	"createAPI() throws if a non-implemented API should be created",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);

		assertZWaveErrorAva(t, () => endpoint.createAPI(0xbada55), {
			errorCode: ZWaveErrorCodes.CC_NoAPI,
			messageMatches: "no associated API",
		});
	},
);

test.serial(
	"The API returned from createAPI() throws when trying to access a non-supported CC",
	async (t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		// We must not use Basic CC here, because that is assumed to be always supported
		const api = endpoint.createAPI(CommandClasses["Binary Sensor"]);

		// this does not throw
		api.isSupported();
		// this does
		await assertZWaveErrorAva(t, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: /Node 1 \(endpoint 1\) does not support/,
		});

		// It only includes the endpoint number for non-root endpoints
		(endpoint as any).index = 0;
		await assertZWaveErrorAva(t, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: "Node 1 does not support",
		});
	},
);

test.serial(
	"The commandClasses dictionary throws when trying to access a non-implemented CC",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		assertZWaveErrorAva(t, () => (endpoint.commandClasses as any).FOOBAR, {
			errorCode: ZWaveErrorCodes.CC_NotImplemented,
			messageMatches: "FOOBAR is not implemented",
		});
	},
);

test.serial(
	"The commandClasses dictionary throws when trying to use a command of an unsupported CC",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		assertZWaveErrorAva(t, () => endpoint.commandClasses.Battery.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
			messageMatches: "does not support the Command Class Battery",
		});
	},
);

test.serial(
	"The commandClasses dictionary does not throw when checking support of a CC",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		t.false(endpoint.commandClasses.Battery.isSupported());
	},
);

test.serial(
	"The commandClasses dictionary does not throw when accessing the ID of a CC",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		t.is(endpoint.commandClasses.Battery.ccId, CommandClasses.Battery);
	},
);

test.serial(
	"The commandClasses dictionary does not throw when scoping the API options",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		t.notThrows(() => endpoint.commandClasses.Battery.withOptions({}));
	},
);

test.serial(
	"The commandClasses dictionary returns all supported CCs when being enumerated",
	(t) => {
		const { driver } = t.context;
		// No supported CCs, empty array
		let node = new ZWaveNode(2, driver, undefined, []);
		let actual = [...node.commandClasses];
		t.deepEqual(actual, []);

		// Supported and controlled CCs
		node = new ZWaveNode(
			2,
			driver,
			undefined,
			[CommandClasses.Battery, CommandClasses.Version],
			[CommandClasses["Wake Up"]],
		);
		actual = [...node.commandClasses];
		t.is(actual.length, 2);
		t.deepEqual(
			actual.map((api) => api.constructor),
			[
				BatteryCCAPI,
				VersionCCAPI,
				// WakeUpCCAPI is not supported (only controlled), so no API!
			],
		);
		node.destroy();
	},
);

test.serial(
	"The commandClasses dictionary returns [object Object] when turned into a string",
	(t) => {
		const { driver } = t.context;
		const node = new ZWaveNode(2, driver, undefined, []);
		t.is(
			(node.commandClasses as any)[Symbol.toStringTag],
			"[object Object]",
		);
		node.destroy();
	},
);

test.serial(
	"The commandClasses dictionary returns undefined for other symbol properties",
	(t) => {
		const { driver } = t.context;
		const node = new ZWaveNode(2, driver, undefined, []);
		t.is((node.commandClasses as any)[Symbol.unscopables], undefined);
		node.destroy();
	},
);

test.serial(
	"createCCInstance() returns undefined if the node supports the CC but it is not yet implemented",
	(t) => {
		const { driver } = t.context;
		const endpoint = new Endpoint(1, driver, 1);
		const cc = 0xbada55;
		endpoint.addCC(cc, { isSupported: true });
		const instance = endpoint.createCCInstance(cc);
		t.is(instance, undefined);
	},
);

test.serial(
	"A non-root endpoint with the `Power Strip Switch` device class does not support the Multi Channel CC",
	async (t) => {
		const { driver } = t.context;
		const powerStripSwitch = new DeviceClass(
			driver.configManager,
			0x01,
			0x10,
			0x04,
		);

		const node = new ZWaveNode(1, driver, powerStripSwitch);
		t.true(node.supportsCC(CommandClasses["Multi Channel"]));
		const ep = new Endpoint(1, driver, 1, powerStripSwitch);
		t.false(ep.supportsCC(CommandClasses["Multi Channel"]));
	},
);

test.serial(
	"Non-root endpoints should not have the Manufacturer Specific CC (among others) added as mandatory",
	async (t) => {
		const { driver } = t.context;
		const soundSwitch = new DeviceClass(
			driver.configManager,
			0x01,
			0x03,
			0x01,
		);

		const node = new ZWaveNode(1, driver, soundSwitch);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			1,
			node,
		);

		t.true(node.supportsCC(CommandClasses["Manufacturer Specific"]));
		const ep = new Endpoint(1, driver, 1, soundSwitch);
		t.false(ep.supportsCC(CommandClasses["Manufacturer Specific"]));
	},
);

test.serial(
	"Always-listening nodes should not have the Battery CC added as mandatory",
	async (t) => {
		const { driver } = t.context;
		const soundSwitch = new DeviceClass(
			driver.configManager,
			0x01,
			0x03,
			0x01,
		);

		const node = new ZWaveNode(1, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			1,
			node,
		);
		node["isListening"] = true;
		node["applyDeviceClass"](soundSwitch);

		t.false(node.supportsCC(CommandClasses.Battery));
		const ep = new Endpoint(1, driver, 1, soundSwitch);
		t.false(ep.supportsCC(CommandClasses.Battery));
	},
);
