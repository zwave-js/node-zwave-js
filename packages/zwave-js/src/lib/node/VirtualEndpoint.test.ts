import { BasicCommand } from "@zwave-js/cc";
import type { BinarySensorCCAPI } from "@zwave-js/cc/BinarySensorCC";
import { BinarySwitchCCAPI } from "@zwave-js/cc/BinarySwitchCC";
import {
	CommandClasses,
	ZWaveErrorCodes,
	assertZWaveError,
} from "@zwave-js/core";
import {
	FunctionType,
	SendDataMulticastRequest,
	SendDataRequest,
	type ZWaveSerialStream,
} from "@zwave-js/serial";
import type { MockPort } from "@zwave-js/serial/mock";
import { type ThrowingMap, noop } from "@zwave-js/shared";
import {
	MockController,
	type MockControllerBehavior,
	MockNode,
	getDefaultSupportedFunctionTypes,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import { test as baseTest } from "vitest";
import {
	createDefaultMockControllerBehaviors,
	createDefaultMockNodeBehaviors,
} from "../../Testing.js";
import type { Driver } from "../driver/Driver.js";
import { createAndStartTestingDriver } from "../driver/DriverMock.js";
import { ZWaveNode } from "./Node.js";

interface LocalTestContext {
	context: {
		driver: Driver;
		controller: MockController;
		mockPort: MockPort;
		serial: ZWaveSerialStream;
		makePhysicalNode(nodeId: number): ZWaveNode;
	};
}

const test = baseTest.extend<LocalTestContext>({
	context: [
		async ({}, use) => {
			// Setup
			const context = {} as LocalTestContext["context"];

			const { driver, mockPort, serial } =
				await createAndStartTestingDriver({
					loadConfiguration: false,
					skipNodeInterview: true,
					beforeStartup(mockPort, serial) {
						context.controller = new MockController({
							mockPort,
							serial,
							capabilities: {
								supportedFunctionTypes:
									getDefaultSupportedFunctionTypes().filter(
										(ft) =>
											ft !== FunctionType.SendDataBridge
											&& ft
												!== FunctionType
													.SendDataMulticastBridge,
									),
							},
						});
						context.controller.defineBehavior(
							...createDefaultMockControllerBehaviors(),
						);

						const ignoreBroadcast: MockControllerBehavior = {
							onHostMessage(controller, msg) {
								if (
									msg instanceof SendDataRequest
									&& msg.getNodeId() === 255
								) {
									return true;
								}
							},
						};
						context.controller.defineBehavior(ignoreBroadcast);
					},
				});
			Object.assign(context, { driver, mockPort, serial });

			context.makePhysicalNode = (nodeId: number) => {
				// Make the driver know about the node
				const node = new ZWaveNode(nodeId, driver);
				(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
					nodeId,
					node,
				);

				// Make the mock controller know about the node
				const mockNode = new MockNode({
					id: nodeId,
					controller: context.controller,
				});
				context.controller.addNode(mockNode);

				// Apply default behaviors that are required for interacting with the driver correctly
				mockNode.defineBehavior(...createDefaultMockNodeBehaviors());

				return node;
			};

			// Run tests
			await use(context);

			// Teardown
			driver.removeAllListeners();
			await driver.destroy();
		},
		{ auto: true },
	],
});

test.sequential(
	"createAPI() throws if a non-implemented API should be created",
	({ context, expect }) => {
		const { driver } = context;
		const broadcast = driver.controller.getBroadcastNode();
		assertZWaveError(expect, () => broadcast.createAPI(0xbada55 as any), {
			errorCode: ZWaveErrorCodes.CC_NoAPI,
			messageMatches: "no associated API",
		});
	},
);

test.sequential(
	"the broadcast API throws when trying to access a non-supported CC",
	async ({ context, expect }) => {
		const { driver, makePhysicalNode } = context;
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
		await assertZWaveError(expect, () => api.get(), {
			errorCode: ZWaveErrorCodes.CC_NotSupported,
		});
	},
);

test.sequential(
	"the broadcast API should know it is a broadcast API",
	async ({ context, expect }) => {
		const { driver, makePhysicalNode } = context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const broadcast = driver.controller.getBroadcastNode();

		expect(broadcast.createAPI(CommandClasses.Basic)["isBroadcast"]())
			.toBe(true);
	},
);

test.sequential(
	"the multicast API should know it is a multicast API",
	async ({ context, expect }) => {
		const { driver, makePhysicalNode } = context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const multicast = driver.controller.getMulticastGroup([2, 3]);

		expect(multicast.createAPI(CommandClasses.Basic)["isMulticast"]())
			.toBe(true);
	},
);

{
	function prepareTest(context: LocalTestContext["context"]): {
		node2: ZWaveNode;
		node3: ZWaveNode;
	} {
		return {
			node2: context.makePhysicalNode(2),
			node3: context.makePhysicalNode(3),
		};
	}

	test.sequential(
		"the commandClasses dictionary throws when trying to access a non-implemented CC",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();

			assertZWaveError(
				expect,
				// @ts-expect-error
				() => broadcast.commandClasses.FOOBAR,
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
	// 	({ context, expect }) => {
	// 		const { driver } = context;
	// 		prepareTest(context);

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

	test.sequential(
		"the commandClasses dictionary does not throw when checking support of a CC",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();
			expect(broadcast.commandClasses["Binary Switch"].isSupported())
				.toBe(false);
		},
	);

	test.sequential(
		"the commandClasses dictionary does not throw when accessing the ID of a CC",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();
			expect(
				broadcast.commandClasses["Binary Switch"].ccId,
			).toBe(CommandClasses["Binary Switch"]);
		},
	);

	test.sequential(
		"the commandClasses dictionary does not throw when scoping the API options",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();
			expect(() =>
				broadcast.commandClasses["Binary Switch"].withOptions({})
			).not.toThrow();
		},
	);

	test.sequential(
		"the commandClasses dictionary  returns all supported CCs when being enumerated",
		({ context, expect }) => {
			const { driver } = context;
			const { node2, node3 } = prepareTest(context);

			// No supported CCs, empty array
			let broadcast = driver.controller.getBroadcastNode();
			let actual = [...broadcast.commandClasses];
			expect(actual).toStrictEqual([]);

			// Supported and controlled CCs
			node2.addCC(CommandClasses["Binary Switch"], { isSupported: true });
			node2.addCC(CommandClasses["Wake Up"], { isControlled: true });
			node3.addCC(CommandClasses["Binary Switch"], { isSupported: true });
			node3.addCC(CommandClasses.Version, { isSupported: true });
			broadcast = driver.controller.getBroadcastNode();

			actual = [...broadcast.commandClasses];
			expect(actual.length).toBe(1);
			expect(
				actual.map((api) => api.constructor),
			).toStrictEqual([
				BinarySwitchCCAPI,
				// VersionCCAPI cannot be used in broadcast
				// WakeUpCCAPI is not supported (only controlled), so no API!
			]);
		},
	);

	test.sequential(
		"the commandClasses dictionary  returns [object Object] when turned into a string",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();
			expect(
				// @ts-expect-error
				broadcast.commandClasses[Symbol.toStringTag],
			).toBe("[object Object]");
		},
	);

	test.sequential(
		"the commandClasses dictionary  returns undefined for other symbol properties",
		({ context, expect }) => {
			const { driver } = context;
			prepareTest(context);

			const broadcast = driver.controller.getBroadcastNode();
			expect(
				// @ts-expect-error
				broadcast.commandClasses[Symbol.unscopables],
			).toBeUndefined();
		},
	);
}

test.sequential(
	"broadcast uses the correct commands behind the scenes",
	async ({ context, expect }) => {
		const { driver, controller, makePhysicalNode } = context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const broadcast = driver.controller.getBroadcastNode();
		broadcast.commandClasses.Basic.set(99).catch(noop);
		await wait(1);
		// » [Node 255] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:        1
		//   └─[BasicCCSet]
		controller.assertReceivedHostMessage((msg) =>
			msg instanceof SendDataRequest
			&& msg.getNodeId() === 255
			&& msg.serializedCC?.[0] === CommandClasses.Basic
			&& msg.serializedCC?.[1] === BasicCommand.Set
		);
	},
);

test.sequential(
	"multicast uses the correct commands behind the scenes",
	async ({ context, expect }) => {
		const { driver, controller, makePhysicalNode } = context;
		makePhysicalNode(2);
		makePhysicalNode(3);
		const multicast = driver.controller.getMulticastGroup([2, 3]);
		multicast.commandClasses.Basic.set(99).catch(noop);
		await wait(1);
		// » [Node 2, 3] [REQ] [SendData]
		//   │ transmit options: 0x25
		//   │ callback id:        1
		//   └─[BasicCCSet]
		controller.assertReceivedHostMessage((msg) =>
			msg instanceof SendDataMulticastRequest
			&& msg.nodeIds.length === 2
			&& msg.nodeIds.includes(2)
			&& msg.nodeIds.includes(3)
			&& msg.serializedCC?.[0] === CommandClasses.Basic
			&& msg.serializedCC?.[1] === BasicCommand.Set
		);
	},
);
