import { getCCConstructor } from "@zwave-js/cc";
import { BasicCC } from "@zwave-js/cc/BasicCC";
import { NoOperationCC } from "@zwave-js/cc/NoOperationCC";
import {
	applicationCCs,
	assertZWaveError,
	CommandClasses,
	CommandClassInfo,
	getCCName,
	NodeType,
	nonApplicationCCs,
	ProtocolVersion,
	topologicalSort,
	ValueID,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ThrowingMap } from "@zwave-js/shared";
import { MockController } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import type { Driver } from "../driver/Driver";
import { createAndStartTestingDriver } from "../driver/DriverMock";
import { ApplicationUpdateRequestNodeInfoReceived } from "../serialapi/application/ApplicationUpdateRequest";
import {
	GetNodeProtocolInfoRequest,
	GetNodeProtocolInfoResponse,
} from "../serialapi/network-mgmt/GetNodeProtocolInfoMessages";
import { RequestNodeInfoRequest } from "../serialapi/network-mgmt/RequestNodeInfoMessages";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";
import { createEmptyMockDriver } from "../test/mocks";
import { ZWaveNode } from "./Node";
import { InterviewStage, NodeStatus } from "./_Types";

/** This is an ugly hack to be able to test the private methods without resorting to @internal */
class TestNode extends ZWaveNode {
	public async queryProtocolInfo(): Promise<void> {
		return super.queryProtocolInfo();
	}
	public async ping(): Promise<boolean> {
		return super.ping();
	}
	public async interviewNodeInfo(): Promise<void> {
		return super["interviewNodeInfo"]();
	}
	public async interviewCCs(): Promise<boolean> {
		return super.interviewCCs();
	}
	// public async queryEndpoints(): Promise<void> {
	// 	return super.queryEndpoints();
	// }
	// public async configureWakeup(): Promise<void> {
	// 	return super.configureWakeup();
	// }
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
		await import("@zwave-js/cc/BatteryCC");
		await import("@zwave-js/cc/ThermostatSetpointCC");
		await import("@zwave-js/cc/VersionCC");
	});

	describe("interview()", () => {
		let fakeDriver: ReturnType<typeof createEmptyMockDriver>;
		let node: ZWaveNode;

		beforeAll(
			async () => {
				fakeDriver = createEmptyMockDriver();
				node = new ZWaveNode(2, fakeDriver as any);
				fakeDriver.controller.nodes.set(node.id, node);

				await fakeDriver.configManager.loadDeviceClasses();
			},
			// Loading configuration may take a while on CI
			30000,
		);

		afterAll(() => {
			node.destroy();
		});

		// We might need to persist the node state between stages, so
		// it shouldn't be created for each test

		describe(`queryProtocolInfo()`, () => {
			let expected: GetNodeProtocolInfoResponse;

			beforeAll(() => {
				fakeDriver.sendMessage.mockClear();

				expected = {
					isListening: true,
					isFrequentListening: false,
					isRouting: true,
					supportedDataRates: [100000],
					supportsSecurity: false,
					protocolVersion: ProtocolVersion["4.5x / 6.0x"],
					supportsBeaming: false,
					nodeType: NodeType.Controller,
					basicDeviceClass: 0x01,
					genericDeviceClass: 0x03,
					specificDeviceClass: 0x02,
				} as unknown as GetNodeProtocolInfoResponse;

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

			// TODO: Do this with Mock Controller etc.
			it.skip("should remember all received information", () => {
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

		describe(`interviewNodeInfo()`, () => {
			beforeAll(() =>
				fakeDriver.sendMessage.mockImplementation(() =>
					Promise.resolve(
						new ApplicationUpdateRequestNodeInfoReceived(
							undefined as any,
							{
								nodeInformation: {
									nodeId: 2,
									supportedCCs: [],
								},
							} as any,
						),
					),
				),
			);
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "NodeInfo"`, async () => {
				await node["interviewNodeInfo"]();
				expect(node.interviewStage).toBe(InterviewStage.NodeInfo);
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node["interviewNodeInfo"]();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should send a RequestNodeInfoRequest with the node's ID", async () => {
				await node["interviewNodeInfo"]();
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
			beforeEach(() => {
				fakeDriver.sendMessage.mockClear();
				fakeDriver.networkCache.clear();
			});

			it.todo("test that the CC interview methods are called");

			it("the CC interviews happen in the correct order", () => {
				require("@zwave-js/cc/index");
				expect(getCCConstructor(49)).not.toBeUndefined();

				const node = new ZWaveNode(2, fakeDriver as any);
				const CCs = [
					CommandClasses["Z-Wave Plus Info"],
					CommandClasses["Device Reset Locally"],
					CommandClasses["Firmware Update Meta Data"],
					CommandClasses["CRC-16 Encapsulation"],
					CommandClasses["Multi Channel"],
					CommandClasses["Multilevel Switch"],
					CommandClasses.Configuration,
					CommandClasses["Multilevel Sensor"],
					CommandClasses.Meter,
					CommandClasses.Protection,
					CommandClasses.Association,
					CommandClasses["Multi Channel Association"],
					CommandClasses["Association Group Information"],
					CommandClasses.Notification,
					CommandClasses["Manufacturer Specific"],
					CommandClasses.Version,
				];
				for (const cc of CCs) {
					node.addCC(cc, { isSupported: true, version: 1 });
				}

				const rootInterviewGraphPart1 = node.buildCCInterviewGraph([
					CommandClasses.Security,
					CommandClasses["Security 2"],
					CommandClasses["Manufacturer Specific"],
					CommandClasses.Version,
					...applicationCCs,
				]);
				const rootInterviewGraphPart2 = node.buildCCInterviewGraph([
					...nonApplicationCCs,
				]);

				const rootInterviewOrderPart1 = topologicalSort(
					rootInterviewGraphPart1,
				);
				const rootInterviewOrderPart2 = topologicalSort(
					rootInterviewGraphPart2,
				);

				expect(
					rootInterviewOrderPart1.map((cc) => getCCName(cc)),
				).toEqual([
					"Z-Wave Plus Info",
					"Device Reset Locally",
					"Firmware Update Meta Data",
					"CRC-16 Encapsulation",
					"Multi Channel",
					"Association",
					"Multi Channel Association",
					"Association Group Information",
				]);
				expect(
					rootInterviewOrderPart2.map((cc) => getCCName(cc)),
				).toEqual([
					"Multilevel Switch",
					"Configuration",
					"Multilevel Sensor",
					"Meter",
					"Protection",
					"Notification",
				]);
			});

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
					interviewNodeInfo: InterviewStage.NodeInfo,
					interviewCCs: InterviewStage.CommandClasses,
				};
				const returnValues: Partial<Record<keyof TestNode, any>> = {
					ping: true,
					interviewCCs: true,
				};
				originalMethods = {
					queryProtocolInfo: node["queryProtocolInfo"].bind(node),
					interviewNodeInfo: node["interviewNodeInfo"].bind(node),
					interviewCCs: node["interviewCCs"].bind(node),
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
				await node.interviewInternal();
				for (const method of Object.keys(originalMethods)) {
					expect((node as any)[method]).toBeCalled();
				}
			});

			it("should not execute any interview method if the interview is completed", async () => {
				node.interviewStage = InterviewStage.Complete;
				await node.interviewInternal();
				for (const method of Object.keys(originalMethods)) {
					expect((node as any)[method]).not.toBeCalled();
				}
			});

			it("should skip all methods that belong to an earlier stage", async () => {
				node.interviewStage = InterviewStage.NodeInfo;
				await node.interviewInternal();

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

	describe("createCCInstance()", () => {
		let driver: Driver;
		let controller: MockController;

		beforeAll(async () => {
			({ driver } = await createAndStartTestingDriver({
				skipNodeInterview: true,
				loadConfiguration: false,
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
				},
			}));
		});

		afterAll(async () => {
			await driver.destroy();
		});

		it("should throw if the CC is not supported", () => {
			const node = new ZWaveNode(2, driver);
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
			const node = new ZWaveNode(2, driver);
			(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
				node.id,
				node,
			);
			node.addCC(CommandClasses.Basic, { isSupported: true });

			const cc = node.createCCInstance(BasicCC)!;
			expect(cc).toBeInstanceOf(BasicCC);
			expect(cc.getNode(driver)).toBe(node);
			node.destroy();
		});
	});

	describe("the emitted events", () => {
		let node: ZWaveNode;
		let driver: Driver;
		let controller: MockController;

		beforeAll(async () => {
			({ driver } = await createAndStartTestingDriver({
				skipNodeInterview: true,
				loadConfiguration: false,
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
				},
			}));
		});

		afterAll(async () => {
			await driver.destroy();
		});

		const onValueAdded = jest.fn();
		const onValueUpdated = jest.fn();
		const onValueRemoved = jest.fn();

		function createNode(): void {
			node = new ZWaveNode(1, driver)
				.on("value added", onValueAdded)
				.on("value updated", onValueUpdated)
				.on("value removed", onValueRemoved);
			(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).set(
				node.id,
				node,
			);
		}

		beforeEach(() => {
			createNode();
			onValueAdded.mockClear();
			onValueUpdated.mockClear();
			onValueRemoved.mockClear();
		});

		afterEach(() => {
			node.destroy();
			(driver.controller.nodes as ThrowingMap<number, ZWaveNode>).delete(
				node.id,
			);
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
});
