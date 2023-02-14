import type { BinarySensorCCAPI } from "@zwave-js/cc/BinarySensorCC";
import { BinarySwitchCCAPI } from "@zwave-js/cc/BinarySwitchCC";
import {
	assertZWaveError,
	CommandClasses,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { FunctionType } from "@zwave-js/serial";
import type { MockSerialPort } from "@zwave-js/serial/mock";
import type { ThrowingMap } from "@zwave-js/shared";
import { wait } from "alcalzone-shared/async";
import ava, { ExecutionContext, type TestFn } from "ava";
import { ZWaveController } from "../controller/Controller";
import type { Driver } from "../driver/Driver";
import { createAndStartDriver } from "../test/utils";
import { ZWaveNode } from "./Node";

interface TestContext {
	driver: Driver;
	serialport: MockSerialPort;
	makePhysicalNode(nodeId: number): ZWaveNode;
}

const test = ava as TestFn<TestContext>;

test.beforeEach(async (t) => {
	const { driver, serialport } = await createAndStartDriver();
	driver["_controller"] = new ZWaveController(driver);
	driver["_controller"].isFunctionSupported = isFunctionSupported;

	t.context.driver = driver;
	t.context.serialport = serialport;
	t.context.makePhysicalNode = (nodeId: number) => {
		const node = new ZWaveNode(nodeId, driver);
		(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
			nodeId,
			node,
		);
		return node;
	};
});

test.afterEach.always(async (t) => {
	const { driver } = t.context;
	await driver.destroy();
	driver.removeAllListeners();
});

// Test mock for isFunctionSupported to control which commands are getting used
function isFunctionSupported(fn: FunctionType): boolean {
	switch (fn) {
		case FunctionType.SendDataBridge:
		case FunctionType.SendDataMulticastBridge:
			return false;
	}
	return true;
}

test.serial(
	"createAPI() throws if a non-implemented API should be created",
	(t) => {
		const { driver } = t.context;
		const broadcast = driver.controller.getBroadcastNode();
		assertZWaveError(t, () => broadcast.createAPI(0xbada55), {
			errorCode: ZWaveErrorCodes.CC_NoAPI,
			messageMatches: "no associated API",
		});
	},
);

test.serial(
	"the broadcast API throws when trying to access a non-supported CC",
	async (t) => {
		const { driver, makePhysicalNode } = t.context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const broadcast = driver.controller.getBroadcastNode();

		// We must not use Basic CC here, because that is assumed to be always supported
		const api = broadcast.createAPI(
			CommandClasses["Binary Switch"],
		) as BinarySensorCCAPI;

		// this does not throw
		api.isSupported();
		// this does
		await assertZWaveError(t, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
		});
	},
);

test.serial(
	"the broadcast API should know it is a broadcast API",
	async (t) => {
		const { driver, makePhysicalNode } = t.context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const broadcast = driver.controller.getBroadcastNode();

		t.true(broadcast.createAPI(CommandClasses.Basic)["isBroadcast"]());
	},
);

test.serial(
	"the multicast API should know it is a multicast API",
	async (t) => {
		const { driver, makePhysicalNode } = t.context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const multicast = driver.controller.getMulticastGroup([2, 3]);

		t.true(multicast.createAPI(CommandClasses.Basic)["isMulticast"]());
	},
);

{
	function prepareTest(t: ExecutionContext<TestContext>): {
		node2: ZWaveNode;
		node3: ZWaveNode;
	} {
		return {
			node2: t.context.makePhysicalNode(2),
			node3: t.context.makePhysicalNode(3),
		};
	}

	test.serial(
		"the commandClasses dictionary throws when trying to access a non-implemented CC",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();

			assertZWaveError(
				t,
				() => (broadcast.commandClasses as any).FOOBAR,
				{
					errorCode: ZWaveErrorCodes.CC_NotImplemented,
					messageMatches: "FOOBAR is not implemented",
				},
			);
		},
	);

	// This test never worked:
	// test.serial.only(
	// 	"the commandClasses dictionary throws when trying to use a command of an unsupported CC",
	// 	(t) => {
	// 		const { driver } = t.context;
	// 		prepareTest(t);

	// 		const broadcast = driver.controller.getBroadcastNode();
	// 		assertZWaveError(
	// 			t,
	// 			() => broadcast.commandClasses["Binary Switch"].set(true),
	// 			{
	// 				errorCode: ZWaveErrorCodes.CC_NotSupported,
	// 				messageMatches:
	// 					"does not support the Command Class Binary Switch",
	// 			},
	// 		);
	// 	},
	// );

	test.serial(
		"the commandClasses dictionary does not throw when checking support of a CC",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();
			t.false(broadcast.commandClasses["Binary Switch"].isSupported());
		},
	);

	test.serial(
		"the commandClasses dictionary  does not throw when accessing the ID of a CC",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();
			t.is(
				broadcast.commandClasses["Binary Switch"].ccId,
				CommandClasses["Binary Switch"],
			);
		},
	);

	test.serial(
		"the commandClasses dictionary  does not throw when scoping the API options",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();
			t.notThrows(() =>
				broadcast.commandClasses["Binary Switch"].withOptions({}),
			);
		},
	);

	test.serial(
		"the commandClasses dictionary  returns all supported CCs when being enumerated",
		(t) => {
			const { driver } = t.context;
			const { node2, node3 } = prepareTest(t);

			// No supported CCs, empty array
			let broadcast = driver.controller.getBroadcastNode();
			let actual = [...broadcast.commandClasses];
			t.deepEqual(actual, []);

			// Supported and controlled CCs
			node2.addCC(CommandClasses["Binary Switch"], { isSupported: true });
			node2.addCC(CommandClasses["Wake Up"], { isControlled: true });
			node3.addCC(CommandClasses["Binary Switch"], { isSupported: true });
			node3.addCC(CommandClasses.Version, { isSupported: true });
			broadcast = driver.controller.getBroadcastNode();

			actual = [...broadcast.commandClasses];
			t.is(actual.length, 1);
			t.deepEqual(
				actual.map((api) => api.constructor),
				[
					BinarySwitchCCAPI,
					// VersionCCAPI cannot be used in broadcast
					// WakeUpCCAPI is not supported (only controlled), so no API!
				],
			);
		},
	);

	test.serial(
		"the commandClasses dictionary  returns [object Object] when turned into a string",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();
			t.is(
				(broadcast.commandClasses as any)[Symbol.toStringTag],
				"[object Object]",
			);
		},
	);

	test.serial(
		"the commandClasses dictionary  returns undefined for other symbol properties",
		(t) => {
			const { driver } = t.context;
			prepareTest(t);

			const broadcast = driver.controller.getBroadcastNode();
			t.is(
				(broadcast.commandClasses as any)[Symbol.unscopables],
				undefined,
			);
		},
	);
}

test.serial(
	"broadcast uses the correct commands behind the scenes",
	async (t) => {
		const { driver, serialport, makePhysicalNode } = t.context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const broadcast = driver.controller.getBroadcastNode();
		broadcast.commandClasses.Basic.set(99);
		await wait(1);
		// » [Node 255] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:        1
		//   └─[BasicCCSet]
		t.deepEqual(
			serialport.lastWrite,
			Buffer.from("010a0013ff0320016325017c", "hex"),
		);
	},
);

test.serial(
	"multicast uses the correct commands behind the scenes",
	async (t) => {
		const { driver, serialport, makePhysicalNode } = t.context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const multicast = driver.controller.getMulticastGroup([2, 3]);
		multicast.commandClasses.Basic.set(99);
		await wait(1);
		// » [Node 2, 3] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:        1
		//   └─[BasicCCSet]
		t.deepEqual(
			serialport.lastWrite,
			Buffer.from("010c001402020303200163250181", "hex"),
		);
	},
);
