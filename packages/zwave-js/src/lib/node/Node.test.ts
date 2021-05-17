import {
	assertZWaveError,
	CommandClasses,
	CommandClassInfo,
	ValueDB,
	ValueID,
	ValueMetadata,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { BasicCC, BasicCommand } from "../commandclass/BasicCC";
import {
	BinarySwitchCCReport,
	BinarySwitchCommand,
} from "../commandclass/BinarySwitchCC";
import {
	EntryControlCCNotification,
	EntryControlCommand,
	EntryControlDataTypes,
	EntryControlEventTypes,
} from "../commandclass/EntryControlCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { WakeUpCC, WakeUpCommand } from "../commandclass/WakeUpCC";
import {
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../controller/GetNodeProtocolInfoMessages";
import { SendDataRequest } from "../controller/SendDataMessages";
import type { Driver } from "../driver/Driver";
import { assertCC } from "../test/assertCC";
import { createEmptyMockDriver } from "../test/mocks";
import { DeviceClass } from "./DeviceClass";
import { ZWaveNode } from "./Node";
import { RequestNodeInfoRequest } from "./RequestNodeInfoMessages";
import {
	InterviewStage,
	NodeStatus,
	NodeType,
	ProtocolVersion,
	ZWaveNodeEvents,
} from "./Types";

/** This is an ugly hack to be able to test the private methods without resorting to @internal */
class TestNode extends ZWaveNode {
	public async queryProtocolInfo(): Promise<void> {
		return super.queryProtocolInfo();
	}
	public async ping(): Promise<boolean> {
		return super.ping();
	}
	public async queryNodeInfo(): Promise<void> {
		return super["queryNodeInfo"]();
	}
	public async interviewCCs(): Promise<boolean> {
		return super.interviewCCs();
	}
	// public async queryManufacturerSpecific(): Promise<void> {
	// 	return super.queryManufacturerSpecific();
	// }
	// public async queryCCVersions(): Promise<void> {
	// 	return super.queryCCVersions();
	// }
	// public async queryEndpoints(): Promise<void> {
	// 	return super.queryEndpoints();
	// }
	// public async configureWakeup(): Promise<void> {
	// 	return super.configureWakeup();
	// }
	// public async requestStaticValues(): Promise<void> {
	// 	return super.requestStaticValues();
	// }
	public async queryNeighbors(): Promise<void> {
		return super["queryNeighbors"]();
	}
	public get implementedCommandClasses(): Map<
		CommandClasses,
		CommandClassInfo
	> {
		return super.implementedCommandClasses as any;
	}
}

describe("lib/node/Node", () => {
	beforeAll(async () => {
		// Load all CCs manually to populate the metadata
		await import("../commandclass/BatteryCC");
		await import("../commandclass/ThermostatSetpointCC");
		await import("../commandclass/VersionCC");
	});

	describe("constructor", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

		beforeAll(async () => {
			await fakeDriver.configManager.loadDeviceClasses();
		});

		it("stores the given Node ID", () => {
			const node1 = new ZWaveNode(1, fakeDriver);
			expect(node1.id).toBe(1);
			const node3 = new ZWaveNode(3, fakeDriver);
			expect(node3.id).toBe(3);

			node1.destroy();
			node3.destroy();
		});

		it("stores the given device class", () => {
			function makeNode(cls: DeviceClass): ZWaveNode {
				return new ZWaveNode(1, fakeDriver, cls);
			}

			const nodeUndef = makeNode(undefined as any);
			expect(nodeUndef.deviceClass).toBeUndefined();

			const devCls = new DeviceClass(
				fakeDriver.configManager,
				0x02,
				0x01,
				0x03,
			);
			const nodeWithClass = makeNode(devCls);
			expect(nodeWithClass.deviceClass).toBe(devCls);

			nodeUndef.destroy();
			nodeWithClass.destroy();
		});

		it("remembers all given command classes", () => {
			function makeNode(
				supportedCCs: CommandClasses[] = [],
				controlledCCs: CommandClasses[] = [],
			): ZWaveNode {
				return new ZWaveNode(
					1,
					fakeDriver,
					undefined,
					supportedCCs,
					controlledCCs,
				);
			}

			const tests: {
				supported: CommandClasses[];
				controlled: CommandClasses[];
			}[] = [
				{
					supported: [CommandClasses["Anti-Theft"]],
					controlled: [CommandClasses.Basic],
				},
			];
			for (const { supported, controlled } of tests) {
				const node = makeNode(supported, controlled);

				for (const supp of supported) {
					expect(node.supportsCC(supp)).toBeTrue();
				}
				for (const ctrl of controlled) {
					expect(node.controlsCC(ctrl)).toBeTrue();
				}

				node.destroy();
			}
		});

		it("initializes the node's value DB", () => {
			const node = new ZWaveNode(1, fakeDriver);
			expect(node.valueDB).toBeInstanceOf(ValueDB);
			node.destroy();
		});

		it("marks the mandatory CCs as supported/controlled", () => {
			// Portable Scene Controller
			const deviceClass = new DeviceClass(
				fakeDriver.configManager,
				0x01,
				0x01,
				0x02,
			);
			const node = new ZWaveNode(1, fakeDriver, deviceClass);
			expect(node.supportsCC(CommandClasses.Association)).toBeTrue();
			expect(
				node.supportsCC(
					CommandClasses["Scene Controller Configuration"],
				),
			).toBeTrue();
			expect(
				node.supportsCC(CommandClasses["Manufacturer Specific"]),
			).toBeTrue();
			expect(node.controlsCC(CommandClasses["Scene Activation"]));
			node.destroy();
		});
	});

	describe("interview()", () => {
		let fakeDriver: ReturnType<typeof createEmptyMockDriver>;
		let node: ZWaveNode;

		beforeAll(async () => {
			fakeDriver = createEmptyMockDriver();
			node = new ZWaveNode(2, fakeDriver as any);
			(fakeDriver.controller.nodes as any).set(node.id, node);
			await fakeDriver.configManager.loadDeviceClasses();
		});

		afterAll(() => {
			node.destroy();
		});

		// We might need to persist the node state between stages, so
		// it shouldn't be created for each test

		describe(`queryProtocolInfo()`, () => {
			let expected: GetNodeProtocolInfoResponse;

			beforeAll(() => {
				fakeDriver.sendMessage.mockClear();

				expected = ({
					isListening: true,
					isFrequentListening: false,
					isRouting: true,
					supportedDataRates: [100000],
					supportsSecurity: false,
					protocolVersion: ProtocolVersion["4.5x / 6.0x"],
					supportsBeaming: false,
					nodeType: NodeType.Controller,
					deviceClass: new DeviceClass(
						fakeDriver.configManager,
						0x01,
						0x03,
						0x02,
					),
				} as unknown) as GetNodeProtocolInfoResponse;

				fakeDriver.sendMessage.mockResolvedValue(expected);
			});

			it("should send a GetNodeProtocolInfoRequest", async () => {
				await node["queryProtocolInfo"]();

				expect(fakeDriver.sendMessage).toBeCalled();
				const request: GetNodeProtocolInfoRequest =
					fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(GetNodeProtocolInfoRequest);
				expect(request.requestedNodeId).toBe(node.id);
			});

			it("should remember all received information", () => {
				for (const prop of Object.keys(
					expected,
				) as (keyof typeof expected)[]) {
					expect((node as any)[prop]).toBe(expected[prop]);
				}
			});

			it("should set the interview stage to ProtocolInfo", () => {
				expect(node.interviewStage).toBe(InterviewStage.ProtocolInfo);
			});

			it("if the node is a sleeping device, assume that it is asleep", async () => {
				for (const { isListening, isFrequentListening } of [
					// Test 1-3: not sleeping
					{
						isListening: true,
						isFrequentListening: true,
					},
					{
						isListening: false,
						isFrequentListening: true,
					},
					{
						isListening: true,
						isFrequentListening: false,
					},
					// Test 4: sleeping
					{
						isListening: false,
						isFrequentListening: false,
					},
				]) {
					Object.assign(expected, {
						isListening,
						isFrequentListening,
					});
					await node["queryProtocolInfo"]();

					if (node.canSleep) {
						expect(node.status).toBe(NodeStatus.Asleep);
					}
				}
			});
		});

		describe(`ping()`, () => {
			beforeAll(() =>
				fakeDriver.sendMessage.mockImplementation(() =>
					Promise.resolve(),
				),
			);
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should not change the current interview stage`, async () => {
				node.interviewStage = InterviewStage.OverwriteConfig;
				await node.ping();
				expect(node.interviewStage).toBe(
					InterviewStage.OverwriteConfig,
				);
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node.ping();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should send a NoOperation CC and wait for the response", async () => {
				await node.ping();

				expect(fakeDriver.sendMessage).toBeCalled();
				const request: SendDataRequest =
					fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(SendDataRequest);
				expect(request.command).toBeInstanceOf(NoOperationCC);
				expect(request.getNodeId()).toBe(node.id);
			});
		});

		describe(`queryNodeInfo()`, () => {
			beforeAll(() =>
				fakeDriver.sendMessage.mockImplementation(() =>
					Promise.resolve(),
				),
			);
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "NodeInfo"`, async () => {
				await node["queryNodeInfo"]();
				expect(node.interviewStage).toBe(InterviewStage.NodeInfo);
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node["queryNodeInfo"]();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should send a RequestNodeInfoRequest with the node's ID", async () => {
				await node["queryNodeInfo"]();
				expect(fakeDriver.sendMessage).toBeCalled();
				const request: RequestNodeInfoRequest =
					fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(RequestNodeInfoRequest);
				expect(request.getNodeId()).toBe(node.id);
			});

			// it.todo("Test the behavior when the request failed");

			// // TODO: We need a real payload for this test
			// it.skip("should update its node information with the received data and mark the node as awake", async () => {
			// 	const nodeUpdate: NodeUpdatePayload = {
			// 		basic: 0x01,
			// 		generic: 0x03,
			// 		specific: 0x01,
			// 		supportedCCs: [CommandClasses["User Code"]],
			// 		controlledCCs: [CommandClasses["Window Covering"]],
			// 		nodeId: 2,
			// 	};
			// 	const expected = new ApplicationUpdateRequest(
			// 		fakeDriver as any,
			// 		{} as any,
			// 	);
			// 	(expected as any)._updateType =
			// 		ApplicationUpdateTypes.NodeInfo_Received;
			// 	(expected as any)._nodeInformation = nodeUpdate;
			// 	fakeDriver.sendMessage.mockResolvedValue(expected);

			// 	await node["queryNodeInfo"]();
			// 	for (const cc of nodeUpdate.supportedCCs) {
			// 		expect(node.supportsCC(cc)).toBeTrue();
			// 	}
			// 	for (const cc of nodeUpdate.controlledCCs) {
			// 		expect(node.controlsCC(cc)).toBeTrue();
			// 	}

			// 	expect(node.isAwake()).toBeTrue();
			// });
		});

		describe(`interviewCCs()`, () => {
			beforeAll(() =>
				fakeDriver.sendMessage.mockImplementation(() =>
					Promise.resolve(),
				),
			);
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it.todo("test that the CC interview methods are called");

			// it("should not send anything if the node is the controller", async () => {
			// 	// Temporarily make this node the controller node
			// 	fakeDriver.controller.ownNodeId = node.id;
			// 	await node["queryNodeInfo"]();
			// 	expect(fakeDriver.sendMessage).not.toBeCalled();
			// 	fakeDriver.controller.ownNodeId = 1;
			// });

			// it("should send a RequestNodeInfoRequest with the node's ID", async () => {
			// 	await node["queryNodeInfo"]();
			// 	expect(fakeDriver.sendMessage).toBeCalled();
			// 	const request: RequestNodeInfoRequest =
			// 		fakeDriver.sendMessage.mock.calls[0][0];
			// 	expect(request).toBeInstanceOf(RequestNodeInfoRequest);
			// 	expect(request.getNodeId()).toBe(node.id);
			// });
		});

		// describe(`queryEndpoints()`, () => {
		// 	beforeAll(() =>
		// 		fakeDriver.sendMessage.mockImplementation(() =>
		// 			Promise.resolve({ command: {} }),
		// 		),
		// 	);
		// 	beforeEach(() => fakeDriver.sendMessage.mockClear());
		// 	afterAll(() =>
		// 		fakeDriver.sendMessage.mockImplementation(() =>
		// 			Promise.resolve(),
		// 		),
		// 	);

		// 	it(`should set the interview stage to "Endpoints"`, async () => {
		// 		await node.queryEndpoints();
		// 		expect(node.interviewStage).toBe(InterviewStage.Endpoints);
		// 	});

		// 	it("should not send anything if the node does not support the Multi Channel CC", async () => {
		// 		node.addCC(CommandClasses["Multi Channel"], {
		// 			isSupported: false,
		// 			isControlled: false,
		// 		});
		// 		await node.queryEndpoints();
		// 		expect(fakeDriver.sendMessage).not.toBeCalled();
		// 	});

		// 	it("should send a MultiChannelCC.EndPointGet", async () => {
		// 		node.addCC(CommandClasses["Multi Channel"], {
		// 			isSupported: true,
		// 		});
		// 		await node.queryEndpoints();

		// 		expect(fakeDriver.sendMessage).toBeCalled();

		// 		assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
		// 			cc: MultiChannelCC,
		// 			nodeId: node.id,
		// 			ccValues: {
		// 				ccCommand: MultiChannelCommand.EndPointGet,
		// 			},
		// 		});
		// 	});

		// 	it.todo("Test the behavior when the request failed");

		// 	it.todo("Test the behavior when the request succeeds");
		// });

		// describe(`queryNeighbors()`, () => {
		// 	let expected: GetRoutingInfoResponse;

		// 	beforeAll(() => {
		// 		fakeDriver.sendMessage.mockClear();

		// 		expected = {
		// 			nodeIds: [1, 4, 5],
		// 		} as GetRoutingInfoResponse;
		// 		fakeDriver.sendMessage.mockResolvedValue(expected);
		// 	});

		// 	it("should send a GetRoutingInfoRequest", async () => {
		// 		await node["queryNeighbors"]();

		// 		expect(fakeDriver.sendMessage).toBeCalled();
		// 		const request: GetRoutingInfoRequest =
		// 			fakeDriver.sendMessage.mock.calls[0][0];
		// 		expect(request).toBeInstanceOf(GetRoutingInfoRequest);
		// 		expect(request.sourceNodeId).toBe(node.id);
		// 	});

		// 	it("should remember the neighbor list", async () => {
		// 		await node["queryNeighbors"]();
		// 		expect(node.neighbors).toContainAllValues(expected.nodeIds);
		// 	});

		// 	it("should set the interview stage to Neighbors", () => {
		// 		expect(node.interviewStage).toBe(InterviewStage.Neighbors);
		// 	});
		// });

		describe("interview sequence", () => {
			let originalMethods: Partial<Record<keyof TestNode, any>>;
			beforeAll(() => {
				const interviewStagesAfter: Record<string, InterviewStage> = {
					queryProtocolInfo: InterviewStage.ProtocolInfo,
					queryNodeInfo: InterviewStage.NodeInfo,
					interviewCCs: InterviewStage.CommandClasses,
					queryNeighbors: InterviewStage.Neighbors,
				};
				const returnValues: Partial<Record<keyof TestNode, any>> = {
					ping: true,
					interviewCCs: true,
				};
				originalMethods = {
					queryProtocolInfo: node["queryProtocolInfo"].bind(node),
					queryNodeInfo: node["queryNodeInfo"].bind(node),
					interviewCCs: node["interviewCCs"].bind(node),
					queryNeighbors: node["queryNeighbors"].bind(node),
				};
				for (const method of Object.keys(
					originalMethods,
				) as (keyof TestNode)[]) {
					(node as any)[method] = jest
						.fn()
						.mockName(`${method} mock`)
						.mockImplementation(() => {
							if (method in interviewStagesAfter)
								node.interviewStage =
									interviewStagesAfter[method];
							return method in returnValues
								? Promise.resolve(returnValues[method])
								: Promise.resolve();
						});
				}
			});

			beforeEach(() => {
				for (const method of Object.keys(originalMethods)) {
					(node as any)[method].mockClear();
				}
			});

			afterAll(() => {
				for (const method of Object.keys(
					originalMethods,
				) as (keyof TestNode)[]) {
					(node as any)[method] = originalMethods[method];
				}
			});

			it("should execute all the interview methods", async () => {
				node.interviewStage = InterviewStage.None;
				await node.interview();
				for (const method of Object.keys(originalMethods)) {
					expect((node as any)[method]).toBeCalled();
				}
			});

			it("should not execute any interview method if the interview is completed", async () => {
				node.interviewStage = InterviewStage.Complete;
				await node.interview();
				for (const method of Object.keys(originalMethods)) {
					expect((node as any)[method]).not.toBeCalled();
				}
			});

			it("should skip all methods that belong to an earlier stage", async () => {
				node.interviewStage = InterviewStage.NodeInfo;
				await node.interview();

				const expectCalled = [
					"interviewCCs",
					// "queryNodePlusInfo",
					// "queryManufacturerSpecific",
					// "queryCCVersions",
					// "queryEndpoints",
					// "requestStaticValues",
					// "configureWakeup",
					"queryNeighbors",
				];
				for (const method of Object.keys(originalMethods)) {
					if (expectCalled.indexOf(method) > -1) {
						expect((node as any)[method]).toBeCalled();
					} else {
						expect((node as any)[method]).not.toBeCalled();
					}
				}
			});

			it.todo("Test restarting from cache");
		});
	});

	// describe("isAwake() / setAwake()", () => {
	// 	const fakeDriver = createEmptyMockDriver();

	// 	function makeNode(supportsWakeUp: boolean = false): ZWaveNode {
	// 		const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
	// 		if (supportsWakeUp)
	// 			node.addCC(CommandClasses["Wake Up"], { isSupported: true });
	// 		fakeDriver.controller.nodes.set(node.id, node);
	// 		return node;
	// 	}

	// 	it("newly created nodes should be assumed awake", () => {
	// 		const node = makeNode();
	// 		expect(node.isAwake()).toBeTrue();
	// 		node.destroy();
	// 	});

	// 	it("setAwake() should NOT throw if the node does not support Wake Up", () => {
	// 		const node = makeNode();
	// 		expect(() => node.markAsAwake()).not.toThrow();
	// 		node.destroy();
	// 	});

	// 	it("isAwake() should return the status set by setAwake()", () => {
	// 		const node = makeNode(true);
	// 		node.markAsAsleep();
	// 		expect(node.isAwake()).toBeFalse();
	// 		node.markAsAwake();
	// 		expect(node.isAwake()).toBeTrue();
	// 		node.destroy();
	// 	});

	// 	it(`setAwake() should emit the "wake up" event when the node wakes up and "sleep" when it goes to sleep`, () => {
	// 		const node = makeNode(true);
	// 		const wakeupSpy = jest.fn();
	// 		const sleepSpy = jest.fn();
	// 		node.on("wake up", wakeupSpy).on("sleep", sleepSpy);
	// 		for (const { state, expectWakeup, expectSleep } of [
	// 			{ state: false, expectSleep: true, expectWakeup: false },
	// 			{ state: true, expectSleep: false, expectWakeup: true },
	// 			{ state: true, expectSleep: false, expectWakeup: false },
	// 			{ state: false, expectSleep: true, expectWakeup: false },
	// 		]) {
	// 			wakeupSpy.mockClear();
	// 			sleepSpy.mockClear();
	// 			state ? node.markAsAwake() : node.markAsAsleep();
	// 			expect(wakeupSpy).toBeCalledTimes(expectWakeup ? 1 : 0);
	// 			expect(sleepSpy).toBeCalledTimes(expectSleep ? 1 : 0);
	// 		}
	// 		node.destroy();
	// 	});
	// });

	describe("updateNodeInfo()", () => {
		const fakeDriver = createEmptyMockDriver();

		function makeNode(canSleep: boolean = false): ZWaveNode {
			const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
			node["_isListening"] = !canSleep;
			node["_isFrequentListening"] = false;
			// node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			fakeDriver.controller.nodes.set(node.id, node);
			return node;
		}

		const emptyNodeInfo = {
			supportedCCs: [],
			controlledCCs: [],
		};

		it("marks a sleeping node as awake", () => {
			const node = makeNode(true);
			node.markAsAsleep();

			node.updateNodeInfo(emptyNodeInfo as any);
			expect(node.status).toBe(NodeStatus.Awake);
			node.destroy();
		});

		it("does not throw when called on a non-sleeping node", () => {
			const node = makeNode(false);
			node.updateNodeInfo(emptyNodeInfo as any);
			node.destroy();
		});

		it("remembers all received CCs", () => {
			const node = makeNode();
			node.addCC(CommandClasses.Battery, {
				isControlled: true,
			});
			node.addCC(CommandClasses.Configuration, {
				isSupported: true,
			});

			node.updateNodeInfo({
				controlledCCs: [CommandClasses.Configuration],
				supportedCCs: [CommandClasses.Battery],
			} as any);
			expect(node.supportsCC(CommandClasses.Battery)).toBeTrue();
			expect(node.controlsCC(CommandClasses.Configuration)).toBeTrue();
			node.destroy();
		});

		it("ignores the data in an NIF if it was received already", () => {
			const node = makeNode();
			node.interviewStage = InterviewStage.Complete;
			node.updateNodeInfo({
				controlledCCs: [CommandClasses.Configuration],
				supportedCCs: [CommandClasses.Battery],
			} as any);

			expect(node.supportsCC(CommandClasses.Battery)).toBeFalse();
			expect(node.controlsCC(CommandClasses.Configuration)).toBeFalse();
			node.destroy();
		});
	});

	describe(`sendNoMoreInformation()`, () => {
		const fakeDriver = createEmptyMockDriver();

		function makeNode(): ZWaveNode {
			const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
			node["_isListening"] = false;
			node["_isFrequentListening"] = false;
			node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			fakeDriver.controller.nodes.set(node.id, node);
			return node;
		}

		beforeEach(() => fakeDriver.sendMessage.mockClear());

		it("should not do anything and return false if the node is asleep", async () => {
			const node = makeNode();
			node.markAsAsleep();

			expect(await node.sendNoMoreInformation()).toBeFalse();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			node.destroy();
		});

		it("should not do anything and return false if the node interview is not complete", async () => {
			const node = makeNode();
			node.interviewStage = InterviewStage.CommandClasses;
			expect(await node.sendNoMoreInformation()).toBeFalse();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			node.destroy();
		});

		it("should not send anything if the node should be kept awake", async () => {
			const node = makeNode();
			node.markAsAwake();
			node.keepAwake = true;

			expect(await node.sendNoMoreInformation()).toBeFalse();
			expect(fakeDriver.sendMessage).not.toBeCalled();
			node.destroy();
		});

		it("should send a WakeupCC.NoMoreInformation otherwise", async () => {
			const node = makeNode();
			node.interviewStage = InterviewStage.Complete;
			node.markAsAwake();
			expect(await node.sendNoMoreInformation()).toBeTrue();
			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: WakeUpCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: WakeUpCommand.NoMoreInformation,
				},
			});
			node.destroy();
		});

		it.todo("Test send failures");
	});

	describe("getCCVersion()", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

		it("should return 0 if a command class is not supported", () => {
			const node = new ZWaveNode(2, fakeDriver);
			expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
			node.destroy();
		});

		it("should return the supported version otherwise", () => {
			const node = new ZWaveNode(2, fakeDriver);
			node.addCC(CommandClasses["Anti-Theft"], {
				isSupported: true,
				version: 5,
			});
			expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(5);
			node.destroy();
		});
	});

	describe("removeCC()", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

		it("should mark a CC as not supported", () => {
			const node = new ZWaveNode(2, fakeDriver);
			node.addCC(CommandClasses["Anti-Theft"], {
				isSupported: true,
				version: 7,
			});
			expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(7);

			node.removeCC(CommandClasses["Anti-Theft"]);
			expect(node.getCCVersion(CommandClasses["Anti-Theft"])).toBe(0);
			node.destroy();
		});
	});

	describe("createCCInstance()", () => {
		const fakeDriver = createEmptyMockDriver();

		it("should throw if the CC is not supported", () => {
			const node = new ZWaveNode(2, fakeDriver as any);
			assertZWaveError(
				() => node.createCCInstance(CommandClasses.Basic),
				{
					errorCode: ZWaveErrorCodes.CC_NotSupported,
					messageMatches: "unsupported",
				},
			);
			node.destroy();
		});

		it("should return a linked instance of the correct CC", () => {
			const node = new ZWaveNode(2, fakeDriver as any);
			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses.Basic, { isSupported: true });

			const cc = node.createCCInstance(BasicCC)!;
			expect(cc).toBeInstanceOf(BasicCC);
			expect(cc.getNode()).toBe(node);
			node.destroy();
		});
	});

	describe("getEndpoint()", () => {
		let node: ZWaveNode;
		beforeEach(async () => {
			const fakeDriver = createEmptyMockDriver();
			await fakeDriver.configManager.loadDeviceClasses();
			node = new ZWaveNode(
				2,
				fakeDriver as any,
				new DeviceClass(fakeDriver.configManager, 0x04, 0x01, 0x01), // Portable Remote Controller
			);
		});

		afterEach(() => {
			node.destroy();
		});

		it("throws when a negative endpoint index is requested", () => {
			assertZWaveError(() => node.getEndpoint(-1), {
				errorCode: ZWaveErrorCodes.Argument_Invalid,
				messageMatches: "must be positive",
			});
		});

		it("returns the node itself when endpoint 0 is requested", () => {
			expect(node.getEndpoint(0)).toBe(node);
		});

		it("returns a new endpoint with the correct endpoint index otherwise", () => {
			// interviewComplete needs to be true for getEndpoint to work
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "interviewComplete",
				},
				true,
			);
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "individualCount",
				},
				5,
			);
			const actual = node.getEndpoint(5)!;
			expect(actual.index).toBe(5);
			expect(actual.nodeId).toBe(2);
		});

		it("caches the created endpoint instances", () => {
			// interviewComplete needs to be true for getEndpoint to work
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "interviewComplete",
				},
				true,
			);
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "individualCount",
				},
				5,
			);
			const first = node.getEndpoint(5);
			const second = node.getEndpoint(5);
			expect(first).not.toBeUndefined();
			expect(first).toBe(second);
		});

		it("returns undefined if a non-existent endpoint is requested", () => {
			const actual = node.getEndpoint(5);
			expect(actual).toBeUndefined();
		});

		it("sets the correct device class for the endpoint", async () => {
			// interviewComplete needs to be true for getEndpoint to work
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "interviewComplete",
				},
				true,
			);
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "individualCount",
				},
				5,
			);

			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					endpoint: 5,
					property: "deviceClass",
				},
				{
					generic: 0x03,
					specific: 0x12, // Doorbell
				},
			);

			const actual = node.getEndpoint(5);
			expect(actual?.deviceClass?.specific.label).toBe("Doorbell");
		});
	});

	describe("serialize() / deserialize()", () => {
		const fakeDriver = (createEmptyMockDriver() as unknown) as Driver;

		beforeAll(async () => {
			await fakeDriver.configManager.loadDeviceClasses();
		});

		const serializedTestNode = {
			id: 1,
			interviewStage: "NodeInfo",
			deviceClass: {
				basic: 2,
				generic: 2,
				specific: 1,
			},
			isListening: true,
			isFrequentListening: false,
			isRouting: false,
			supportedDataRates: [40000],
			supportsSecurity: false,
			isSecure: "unknown",
			supportsBeaming: true,
			protocolVersion: 3,
			nodeType: "Controller",
			neighbors: [2, 3, 4],
			commandClasses: {
				"0x25": {
					name: "Binary Switch",
					endpoints: {
						0: {
							isSupported: false,
							isControlled: true,
							secure: false,
							version: 3,
						},
					},
				},
				"0x26": {
					name: "Multilevel Switch",
					endpoints: {
						0: {
							isSupported: false,
							isControlled: true,
							secure: false,
							version: 4,
						},
					},
				},
			},
		};

		it("serializing a deserialized node should result in the original object", () => {
			const node = new ZWaveNode(1, fakeDriver);
			// @ts-ignore We need write access to the map
			fakeDriver.controller.nodes.set(1, node);
			node.deserialize(serializedTestNode);
			expect(node.serialize()).toEqual(serializedTestNode);
			node.destroy();
		});

		it("deserializing a legacy node object should have the correct properties", () => {
			const node = new ZWaveNode(1, fakeDriver);
			// @ts-ignore We need write access to the map
			fakeDriver.controller.nodes.set(1, node);
			const legacy = {
				...serializedTestNode,
				version: 4, // version 4 -> protocolVersion 3
				isFrequentListening: true, // --> 1000ms
				isBeaming: true,
				maxBaudRate: 40000,
			};
			// @ts-expect-error We want to test this!
			delete legacy.protocolVersion;
			node.deserialize(legacy);
			const expected = {
				...serializedTestNode,
				isFrequentListening: "1000ms",
			};
			expect(node.serialize()).toEqual(expected);
			node.destroy();
		});

		it("a changed interview stage is reflected in the cache", () => {
			const node = new ZWaveNode(1, fakeDriver);
			// @ts-ignore We need write access to the map
			fakeDriver.controller.nodes.set(1, node);
			node.deserialize(serializedTestNode);
			node.interviewStage = InterviewStage.Complete;
			expect(node.serialize().interviewStage).toEqual(
				InterviewStage[InterviewStage.Complete],
			);
			node.destroy();
		});

		it("deserialize() should correctly read values and metadata", () => {
			const input = { ...serializedTestNode };

			const valueId1 = {
				endpoint: 1,
				property: "targetValue",
			};
			const valueId2 = {
				endpoint: 2,
				property: "targetValue",
			};

			(input.commandClasses as any)["0x20"] = {
				name: "Basic",
				isSupported: false,
				isControlled: true,
				version: 1,
				values: [{ ...valueId1, value: 12 }],
				metadata: [
					{
						...valueId2,
						metadata: ValueMetadata.ReadOnlyInt32,
					},
				],
			};

			const node = new ZWaveNode(1, fakeDriver);
			// @ts-ignore We need write access to the map
			fakeDriver.controller.nodes.set(1, node);
			node.deserialize(input);

			expect(
				node.valueDB.getValue({
					...valueId1,
					commandClass: CommandClasses.Basic,
				}),
			).toBe(12);
			expect(
				node.valueDB.getMetadata({
					...valueId2,
					commandClass: CommandClasses.Basic,
				}),
			).toBe(ValueMetadata.ReadOnlyInt32);
			node.destroy();
		});

		it("deserialize() should also accept numbers for the interview stage", () => {
			const input = {
				...serializedTestNode,
				interviewStage: InterviewStage.Neighbors,
			};
			const node = new ZWaveNode(1, fakeDriver);
			node.deserialize(input);
			expect(node.interviewStage).toBe(InterviewStage.Neighbors);
			node.destroy();
		});

		it("deserialize() should skip the deviceClass if it is malformed", () => {
			const node = new ZWaveNode(1, fakeDriver);
			const brokenDeviceClasses = [
				// not an object
				undefined,
				1,
				"foo",
				// incomplete
				{},
				{ basic: 1 },
				{ generic: 2 },
				{ specific: 3 },
				{ basic: 1, generic: 2 },
				{ basic: 1, specific: 3 },
				{ generic: 2, specific: 3 },
				// wrong type
				{ basic: "1", generic: 2, specific: 3 },
				{ basic: 1, generic: true, specific: 3 },
				{ basic: 1, generic: 2, specific: {} },
			];
			for (const dc of brokenDeviceClasses) {
				const input = {
					...serializedTestNode,
					deviceClass: dc,
				};
				(node as any)._deviceClass = undefined;
				node.deserialize(input);
				expect(node.deviceClass).toBeUndefined();
			}
			node.destroy();
		});

		it("deserialize() should skip any primitive properties that have the wrong type", () => {
			const node = new ZWaveNode(1, fakeDriver);
			const wrongInputs: [string, any][] = [
				["isListening", 1],
				["isFrequentListening", 2],
				["isRouting", {}],
				["supportedDataRates", true],
				["supportsSecurity", 3],
				["supportsSecurity", "3"],
				["protocolVersion", false],
			];
			for (const [prop, val] of wrongInputs) {
				const input = {
					...serializedTestNode,
					[prop]: val,
				};
				(node as any)["_" + prop] = undefined;
				node.deserialize(input);
				expect((node as any)[prop]).toBeUndefined();
			}
			node.destroy();
		});

		it("deserialize() should skip command classes that don't have a HEX key", () => {
			const node = new ZWaveNode(1, fakeDriver);
			const input = {
				...serializedTestNode,
				commandClasses: {
					"Binary Switch": {
						name: "Binary Switch",
						isSupported: false,
						isControlled: true,
						version: 3,
					},
				},
			};
			node.deserialize(input);
			expect(node.implementedCommandClasses.size).toBe(0);
			node.destroy();
		});

		it("deserialize() should skip command classes that are not known to this library", () => {
			const node = new ZWaveNode(1, fakeDriver);
			const input = {
				...serializedTestNode,
				commandClasses: {
					"0x001122ff": {
						name: "Binary Switch",
						isSupported: false,
						isControlled: true,
						version: 3,
					},
				},
			};
			node.deserialize(input);
			expect(node.implementedCommandClasses.size).toBe(0);
			node.destroy();
		});

		it("deserialize() should not parse any malformed CC properties", () => {
			const node = new ZWaveNode(1, fakeDriver);
			const input = {
				...serializedTestNode,
				commandClasses: {
					"0x25": {
						isSupported: 1,
					},
					"0x26": {
						isControlled: "",
					},
					"0x27": {
						isSupported: true,
						version: "5",
					},
				},
			};
			node.deserialize(input);
			expect(node.supportsCC(0x25)).toBeFalse();
			expect(node.controlsCC(0x26)).toBeFalse();
			expect(node.getCCVersion(0x27)).toBe(0);
			node.destroy();
		});

		it("deserialize() should set the node status to Unknown if the node can sleep", () => {
			const input = {
				...serializedTestNode,
				isListening: false,
				isFrequentListening: false,
			};
			const node = new ZWaveNode(1, fakeDriver);
			node.deserialize(input);
			expect(node.status).toBe(NodeStatus.Unknown);
			node.destroy();
		});

		it("deserialize() should set the node status to Unknown if the node is a listening node", () => {
			const input = {
				...serializedTestNode,
				isListening: true,
				isFrequentListening: false,
			};
			const node = new ZWaveNode(1, fakeDriver);
			node.deserialize(input);
			expect(node.status).toBe(NodeStatus.Unknown);
			node.destroy();
		});

		it("deserialize() should set the node status to Unknown if the node is a frequent listening node", () => {
			const input = {
				...serializedTestNode,
				isListening: false,
				isFrequentListening: true,
			};
			const node = new ZWaveNode(1, fakeDriver);
			node.deserialize(input);
			expect(node.status).toBe(NodeStatus.Unknown);
			node.destroy();
		});
	});

	describe("the emitted events", () => {
		let node: ZWaveNode;
		const fakeDriver = createEmptyMockDriver();

		const onValueAdded = jest.fn();
		const onValueUpdated = jest.fn();
		const onValueRemoved = jest.fn();

		function createNode(): void {
			node = new ZWaveNode(1, (fakeDriver as unknown) as Driver)
				.on("value added", onValueAdded)
				.on("value updated", onValueUpdated)
				.on("value removed", onValueRemoved);
		}

		beforeEach(() => {
			createNode();
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		afterEach(() => {
			node.destroy();
		});

		it("should contain a speaking name for the CC", () => {
			const cc = CommandClasses["Wake Up"];
			const ccName = CommandClasses[cc];
			const valueId: ValueID = {
				commandClass: cc,
				property: "fooProp",
			};
			node.valueDB.setValue(valueId, 1);
			expect(onValueAdded).toBeCalled();
			node.valueDB.setValue(valueId, 3);
			expect(onValueUpdated).toBeCalled();
			node.valueDB.removeValue(valueId);
			expect(onValueRemoved).toBeCalled();

			for (const method of [
				onValueAdded,
				onValueUpdated,
				onValueRemoved,
			]) {
				const cbArg = method.mock.calls[0][1];
				expect(cbArg.commandClassName).toBe(ccName);
			}
		});

		it("should contain a speaking name for the propertyKey", () => {
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Thermostat Setpoint"],
					property: "setpoint",
					propertyKey: 1 /* Heating */,
				},
				5,
			);
			expect(onValueAdded).toBeCalled();
			const cbArg = onValueAdded.mock.calls[0][1];
			expect(cbArg.propertyKeyName).toBe("Heating");
		});

		it("should not be emitted for internal values", () => {
			node.valueDB.setValue(
				{
					commandClass: CommandClasses.Battery,
					property: "interviewComplete", // interviewCompleted is an internal value
				},
				true,
			);
			expect(onValueAdded).not.toBeCalled();
		});
	});

	describe("changing the node status", () => {
		const fakeDriver = createEmptyMockDriver();

		interface TestOptions {
			targetStatus: NodeStatus;
			expectedEvent: ZWaveNodeEvents;
			expectCall?: boolean; // default true
		}

		function performTest(options: TestOptions): void {
			const node = new ZWaveNode(1, (fakeDriver as unknown) as Driver);
			node["_status"] = undefined as any;
			const spy = jest.fn();
			node.on(options.expectedEvent, spy);
			node["onStatusChange"](options.targetStatus);
			node.destroy();

			if (options.expectCall !== false) {
				expect(spy).toBeCalled();
			} else {
				expect(spy).not.toBeCalled();
			}
			node.destroy();
		}
		it("Changing the status to awake should raise the wake up event", () => {
			performTest({
				targetStatus: NodeStatus.Awake,
				expectedEvent: "wake up",
			});
		});
		it("Changing the status to asleep should raise the sleep event", () => {
			performTest({
				targetStatus: NodeStatus.Asleep,
				expectedEvent: "sleep",
			});
		});

		it("Changing the status to dead should raise the dead event", () => {
			performTest({
				targetStatus: NodeStatus.Dead,
				expectedEvent: "dead",
			});
		});

		it("Changing the status to alive should raise the alive event", () => {
			performTest({
				targetStatus: NodeStatus.Alive,
				expectedEvent: "alive",
			});
		});
	});

	describe("getValue()", () => {
		const fakeDriver = createEmptyMockDriver();
		it("returns the values stored in the value DB", () => {
			const node = new ZWaveNode(1, fakeDriver as any);
			const valueId: ValueID = {
				commandClass: CommandClasses.Version,
				endpoint: 2,
				property: "3",
			};

			node.valueDB.setValue(valueId, 4);

			expect(node.getValue(valueId)).toBe(4);

			node.destroy();
		});
	});

	describe("setValue()", () => {
		const fakeDriver = createEmptyMockDriver();
		it("issues the correct xyzCCSet command", async () => {
			// We test with a BasicCC
			const node = new ZWaveNode(1, fakeDriver as any);
			node.addCC(CommandClasses.Basic, { isSupported: true });

			// Since setValue also issues a get, we need to mock a response
			fakeDriver.sendMessage
				.mockResolvedValueOnce(undefined)
				// For some reason this is called twice?!
				.mockResolvedValue({ command: {} });

			const result = await node.setValue(
				{
					commandClass: CommandClasses.Basic,
					property: "targetValue",
				},
				5,
			);

			expect(result).toBeTrue();
			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: BasicCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: BasicCommand.Set,
				},
			});
			node.destroy();
		});

		it("returns false if the CC is not implemented", async () => {
			const node = new ZWaveNode(1, fakeDriver as any);
			const result = await node.setValue(
				{
					commandClass: 0xbada55, // this is guaranteed to not be implemented
					property: "test",
				},
				1,
			);
			expect(result).toBeFalse();
			node.destroy();
		});
	});

	describe("getValueMetadata()", () => {
		const fakeDriver = createEmptyMockDriver();
		let node: ZWaveNode;
		const valueId: ValueID = {
			commandClass: CommandClasses.Basic,
			property: "currentValue",
		};

		beforeEach(() => {
			node = new ZWaveNode(1, (fakeDriver as unknown) as Driver);
			fakeDriver.controller.nodes.set(1, node);
		});

		afterEach(() => {
			node.destroy();
		});

		it("returns the defined metadata for the given value", () => {
			// We test this with the BasicCC
			// currentValue is readonly, 0-99
			const currentValueMeta = node.getValueMetadata(valueId);
			expect(currentValueMeta).toMatchObject({
				readable: true,
				writeable: false,
				min: 0,
				max: 99,
			});
		});

		it("dynamic metadata is merged with static metadata", () => {
			// Create dynamic metadata
			node.valueDB.setMetadata(valueId, ValueMetadata.WriteOnlyInt32);

			const currentValueMeta = node.getValueMetadata(valueId);

			// The label should be preserved from the static metadata
			expect(currentValueMeta).toMatchObject({ label: "Current value" });
		});

		it("dynamic metadata is prioritized", () => {
			// Update the dynamic metadata
			node.valueDB.setMetadata(valueId, ValueMetadata.WriteOnlyInt32);

			const currentValueMeta = node.getValueMetadata(valueId);

			// But the dynamic metadata properties are preferred over statically defined ones
			expect(currentValueMeta).toMatchObject(
				ValueMetadata.WriteOnlyInt32,
			);
		});
	});

	describe(`handleCommand()`, () => {
		const fakeDriver = createEmptyMockDriver();

		function makeNode(
			ccs: [CommandClasses, Partial<CommandClassInfo>][] = [],
		): ZWaveNode {
			const node = new ZWaveNode(2, (fakeDriver as unknown) as Driver);
			fakeDriver.controller.nodes.set(node.id, node);
			for (const [cc, info] of ccs) {
				node.addCC(cc, info);
			}
			return node;
		}

		beforeEach(() => fakeDriver.sendMessage.mockClear());

		it("should map commands from the root endpoint to endpoint 1 if MultiChannelAssociationCC is V1/V2", async () => {
			const node = makeNode([
				[
					CommandClasses["Multi Channel Association"],
					{ isSupported: true, version: 2 },
				],
			]);
			// We have two endpoints
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					property: "individualCount",
				},
				2,
			);
			node.valueDB.setValue(
				{
					commandClass: CommandClasses["Multi Channel"],
					endpoint: 0,
					property: "interviewComplete",
				},
				true,
			);
			// The endpoint suppports Binary Switch
			node.getEndpoint(1)?.addCC(CommandClasses["Binary Switch"], {
				isSupported: true,
			});

			// Handle a command for the root endpoint
			const command = new BinarySwitchCCReport(
				(fakeDriver as unknown) as Driver,
				{
					nodeId: 2,
					data: Buffer.from([
						CommandClasses["Binary Switch"],
						BinarySwitchCommand.Report,
						0xff,
					]),
				},
			);
			await node.handleCommand(command);

			expect(
				node.getValue({
					commandClass: CommandClasses["Binary Switch"],
					endpoint: 1,
					property: "currentValue",
				}),
			).toBe(true);

			node.destroy();
		});

		it("a notification event is sent when receiving an EntryControlNotification", async () => {
			const node = makeNode([
				[
					CommandClasses["Entry Control"],
					{ isSupported: true, version: 1 },
				],
			]);

			const spy = jest.fn();
			node.on("notification", spy);

			const buf = Buffer.concat([
				Buffer.from([
					CommandClasses["Entry Control"],
					EntryControlCommand.Notification, // CC Command
					0x5,
					0x2,
					0x3,
					16,
					49,
					50,
					51,
					52,
				]),
				// Required padding for ASCII
				Buffer.alloc(12, 0xff),
			]);

			const command = new EntryControlCCNotification(
				(fakeDriver as unknown) as Driver,
				{
					nodeId: node.id,
					data: buf,
				},
			);

			node.handleCommand(command);

			const calls = spy.mock.calls;
			expect(calls.length).toBe(1);
			const call = calls[0];

			expect(call[0].id).toBe(node.id);
			expect(call[1]).toBe(CommandClasses["Entry Control"]);
			expect(call[2]).toEqual({
				dataType: EntryControlDataTypes.ASCII,
				eventType: EntryControlEventTypes.DisarmAll,
				eventData: "1234",
			});

			node.destroy();
		});
	});
});
