/// <reference types="jest-extended" />
import { entries } from "alcalzone-shared/objects";
import { assertZWaveError } from "../../../test/util";
import { BasicCC } from "../commandclass/BasicCC";
import { BinarySensorCC } from "../commandclass/BinarySensorCC";
import { CommandClass, CommandClasses, getCommandClassStatic } from "../commandclass/CommandClass";
import { ManufacturerSpecificCC, ManufacturerSpecificCommand } from "../commandclass/ManufacturerSpecificCC";
import { MultiChannelCC, MultiChannelCommand } from "../commandclass/MultiChannelCC";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { VersionCC, VersionCommand } from "../commandclass/VersionCC";
import { WakeUpCC, WakeUpCommand } from "../commandclass/WakeUpCC";
import { ZWavePlusCC, ZWavePlusCommand } from "../commandclass/ZWavePlusCC";
import { ApplicationUpdateRequest, ApplicationUpdateTypes } from "../controller/ApplicationUpdateRequest";
import { GetNodeProtocolInfoRequest, GetNodeProtocolInfoResponse } from "../controller/GetNodeProtocolInfoMessages";
import { GetRoutingInfoRequest, GetRoutingInfoResponse } from "../controller/GetRoutingInfoMessages";
import { SendDataRequest } from "../controller/SendDataMessages";
import { Driver } from "../driver/Driver";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { Constructable } from "../message/Message";
import { BasicDeviceClasses, DeviceClass, GenericDeviceClass, GenericDeviceClasses, SpecificDeviceClass } from "./DeviceClass";
import { InterviewStage, ZWaveNode } from "./Node";
import { NodeUpdatePayload } from "./NodeInfo";
import { RequestNodeInfoRequest } from "./RequestNodeInfoMessages";
import { ValueDB } from "./ValueDB";

/** This is an ugly hack to be able to test the private methods without resorting to @internal */
class TestNode extends ZWaveNode {

	public async queryProtocolInfo() {
		return super.queryProtocolInfo();
	}
	public async ping(...args: any[]) {
		return super.ping(...args);
	}
	public async queryNodeInfo() {
		return super.queryNodeInfo();
	}
	public async queryNodePlusInfo() {
		return super.queryNodePlusInfo();
	}
	public async queryManufacturerSpecific() {
		return super.queryManufacturerSpecific();
	}
	public async queryCCVersions() {
		return super.queryCCVersions();
	}
	public async queryEndpoints() {
		return super.queryEndpoints();
	}
	public async configureWakeup() {
		return super.configureWakeup();
	}
	public async requestStaticValues() {
		return super.requestStaticValues();
	}
	public async queryNeighbors() {
		return super.queryNeighbors();
	}
}

function assertCC<T extends CommandClass, TConst = Constructable<T>>(callArg: any, options: {
	nodeId?: number,
	cc: TConst,
	ccValues?: Record<string, any>,
}) {
	const request: SendDataRequest = callArg;
	expect(request).toBeInstanceOf(SendDataRequest);
	if (options.nodeId) expect(request.getNodeId()).toBe(options.nodeId);

	const command = request.command as T;
	expect(command).toBeInstanceOf(options.cc);
	if (options.ccValues) {
		for (const [prop, val] of entries(options.ccValues)) {
			expect(command[prop]).toBe(val);
		}
	}
}

describe("lib/node/Node", () => {

	describe("constructor", () => {

		it("stores the given Node ID", () => {
			expect(new ZWaveNode(1, undefined).id).toBe(1);
			expect(new ZWaveNode(3, undefined).id).toBe(3);
		});

		it("stores the given device class", () => {
			function makeNode(cls: DeviceClass) {
				return new ZWaveNode(1, undefined, cls);
			}

			expect(makeNode(undefined).deviceClass).toBeUndefined();

			const devCls = new DeviceClass(
				BasicDeviceClasses.Controller,
				GenericDeviceClass.get(GenericDeviceClasses["Alarm Sensor"]),
				SpecificDeviceClass.get(
					GenericDeviceClasses["Alarm Sensor"],
					0x02,
				),
			);
			expect(makeNode(devCls).deviceClass).toBe(devCls);
		});

		it("remembers all given command classes", () => {
			function makeNode(
				supportedCCs: CommandClasses[] = [],
				controlledCCs: CommandClasses[] = [],
			) {
				return new ZWaveNode(
					1, undefined, undefined,
					supportedCCs, controlledCCs,
				);
			}

			const tests: { supported: CommandClasses[], controlled: CommandClasses[] }[] = [
				{ supported: [CommandClasses["Anti-theft"]], controlled: [CommandClasses.Basic] },
			];
			for (const { supported, controlled } of tests) {
				const node = makeNode(supported, controlled);

				for (const supp of supported) {
					expect(node.supportsCC(supp)).toBeTrue();
				}
				for (const ctrl of controlled) {
					expect(node.controlsCC(ctrl)).toBeTrue();
				}
			}
		});

		it("initializes the node's value DB", () => {
			const node = new ZWaveNode(1, undefined);
			expect(node.valueDB).toBeInstanceOf(ValueDB);
		});
	});

	describe("interview()", () => {

		// TODO: Can we use an existing mock here?
		const fakeDriver = {
			sendMessage: jest.fn(),
			saveNetworkToCache: jest.fn().mockImplementation(() => Promise.resolve()),
			controller: {
				ownNodeId: 1,
				nodes: new Map(),
			},
		};
		const node = new TestNode(2, fakeDriver as unknown as Driver);
		fakeDriver.controller.nodes.set(node.id, node);

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
					maxBaudRate: 100000,
					isSecure: false,
					version: 3,
					isBeaming: false,
					deviceClass: new DeviceClass(
						BasicDeviceClasses.Controller,
						GenericDeviceClass.get(GenericDeviceClasses["Alarm Sensor"]),
						SpecificDeviceClass.get(
							GenericDeviceClasses["Alarm Sensor"],
							0x02,
						),
					),
				} as GetNodeProtocolInfoResponse;

				fakeDriver.sendMessage.mockResolvedValue(expected);
			});

			it("should send a GetNodeProtocolInfoRequest", async () => {
				await node.queryProtocolInfo();

				expect(fakeDriver.sendMessage).toBeCalled();
				const request: GetNodeProtocolInfoRequest = fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(GetNodeProtocolInfoRequest);
				expect(request.nodeId).toBe(node.id);
			});

			it("should remember all received information", () => {
				for (const prop of Object.keys(expected)) {
					expect(node[prop]).toBe(expected[prop]);
				}
			});

			it("should set the interview stage to ProtocolInfo", () => {
				expect(node.interviewStage).toBe(InterviewStage.ProtocolInfo);
			});

			it("if the node is a sleeping device, assume that it is awake", async () => {

				for (const { isListening, isFrequentListening, supportsWakeup } of [
					// Test 1-3: not sleeping
					{ isListening: true, isFrequentListening: true, supportsWakeup: false },
					{ isListening: false, isFrequentListening: true, supportsWakeup: false },
					{ isListening: true, isFrequentListening: false, supportsWakeup: false },
					// Test 4: sleeping
					{ isListening: false, isFrequentListening: false, supportsWakeup: true },
				]) {

					Object.assign(expected, {
						isListening,
						isFrequentListening,
					});
					await node.queryProtocolInfo();

					expect(node.isAwake()).toBeTrue();
					expect(node.supportsCC(CommandClasses["Wake Up"])).toBe(supportsWakeup);
				}

			});
		});

		describe(`waitForWakeup()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "WakeUp"`, async () => {
				await node.configureWakeup();
				expect(node.interviewStage).toBe(InterviewStage.WakeUp);
			});

			it("should not send anything if the node does not support WakeUp", async () => {
				// Temporarily mark Wake Up as not supported
				node.addCC(CommandClasses["Wake Up"], { isSupported: false });
				await node.configureWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node.configureWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should not send anything if the node is frequent listening", async () => {
				// Temporarily make this node frequent listening
				(node as any)._isFrequentListening = true;
				await node.configureWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				(node as any)._isFrequentListening = false;
			});

			it("should send a Wake Up CC and wait for the response", async () => {
				await node.configureWakeup();
				expect(fakeDriver.sendMessage).toBeCalled();
				assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
					nodeId: node.id,
					cc: WakeUpCC,
				});
			});
		});

		describe(`ping()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to the stage passed as an argument`, async () => {
				await node.ping(InterviewStage.Configuration);
				expect(node.interviewStage).toBe(InterviewStage.Configuration);
			});

			it(`should by default set the interview stage to "Ping"`, async () => {
				await node.ping();
				expect(node.interviewStage).toBe(InterviewStage.Ping);
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
				const request: SendDataRequest = fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(SendDataRequest);
				expect(request.command).toBeInstanceOf(NoOperationCC);
				expect(request.getNodeId()).toBe(node.id);
			});
		});

		describe(`queryNodeInfo()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "NodeInfo"`, async () => {
				await node.queryNodeInfo();
				expect(node.interviewStage).toBe(InterviewStage.NodeInfo);
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node.queryNodeInfo();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should send a RequestNodeInfoRequest with the node's ID", async () => {
				await node.queryNodeInfo();
				expect(fakeDriver.sendMessage).toBeCalled();
				const request: RequestNodeInfoRequest = fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(RequestNodeInfoRequest);
				expect(request.getNodeId()).toBe(node.id);
			});

			it.todo("Test the behavior when the request failed");

			it("should update its node information with the received data and mark the node as awake", async () => {
				const nodeUpdate: NodeUpdatePayload = {
					basic: BasicDeviceClasses.Controller,
					generic: GenericDeviceClass.get(GenericDeviceClasses["Multilevel Sensor"]),
					specific: SpecificDeviceClass.get(GenericDeviceClasses["Multilevel Sensor"], 0x02),
					supportedCCs: [CommandClasses["User Code"]],
					controlledCCs: [CommandClasses["Window Covering"]],
					nodeId: 2,
				};
				const expected = new ApplicationUpdateRequest(undefined);
				(expected as any)._updateType = ApplicationUpdateTypes.NodeInfo_Received;
				(expected as any)._nodeInformation = nodeUpdate;
				fakeDriver.sendMessage.mockResolvedValue(expected);

				await node.queryNodeInfo();
				for (const cc of nodeUpdate.supportedCCs) {
					expect(node.supportsCC(cc)).toBeTrue();
				}
				for (const cc of nodeUpdate.controlledCCs) {
					expect(node.controlsCC(cc)).toBeTrue();
				}

				expect(node.isAwake()).toBeTrue();
			});

		});

		describe(`queryNodePlusInfo()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "NodePlusInfo"`, async () => {
				await node.queryNodePlusInfo();
				expect(node.interviewStage).toBe(InterviewStage.NodePlusInfo);
			});

			it("should not send anything if the node does not support the Multi Channel CC", async () => {
				node.addCC(CommandClasses["Z-Wave Plus Info"], { isSupported: false, isControlled: false });
				await node.queryNodePlusInfo();
				expect(fakeDriver.sendMessage).not.toBeCalled();
			});

			it("should send a ZWavePlusCC.Get", async () => {
				node.addCC(CommandClasses["Z-Wave Plus Info"], { isSupported: true });
				await node.queryNodePlusInfo();

				expect(fakeDriver.sendMessage).toBeCalled();

				assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
					cc: ZWavePlusCC,
					nodeId: node.id,
					ccValues: {
						ccCommand: ZWavePlusCommand.Get,
					},
				});
			});

			it.todo("Test the behavior when the request failed");

			it.todo("Test the behavior when the request succeeds");

		});

		describe(`queryManufacturerSpecific()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "ManufacturerSpecific"`, async () => {
				await node.queryManufacturerSpecific();
				expect(node.interviewStage).toBe(InterviewStage.ManufacturerSpecific);
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node.queryManufacturerSpecific();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should send a ManufacturerSpecificCC.Get", async () => {
				await node.queryManufacturerSpecific();

				expect(fakeDriver.sendMessage).toBeCalled();

				assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
					cc: ManufacturerSpecificCC,
					nodeId: node.id,
					ccValues: {
						ccCommand: ManufacturerSpecificCommand.Get,
					},
				});
			});

			it.todo("Test the behavior when the request failed");

			it.todo("Test the behavior when the request succeeds");

		});

		describe(`queryCCVersions()`, () => {
			beforeAll(() => {
				fakeDriver.sendMessage.mockImplementation(() => Promise.resolve());
				node.implementedCommandClasses.clear();
			});
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "Versions"`, async () => {
				await node.queryCCVersions();
				expect(node.interviewStage).toBe(InterviewStage.Versions);
			});

			it("should not send anything if the node doesn't support any CCs", async () => {
				await node.queryCCVersions();
				expect(fakeDriver.sendMessage).not.toBeCalled();
			});

			it("should send a VersionCC.CommandClassGet for each supported CC", async () => {
				// These CCs need to be implemented or the test will fail
				node.addCC(CommandClasses.Basic, { isSupported: true });
				node.addCC(CommandClasses["Binary Sensor"], { isSupported: true });
				await node.queryCCVersions();

				assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
					cc: VersionCC,
					nodeId: node.id,
					ccValues: {
						ccCommand: VersionCommand.CommandClassGet,
						requestedCC: CommandClasses.Basic,
					},
				});

				assertCC(fakeDriver.sendMessage.mock.calls[1][0], {
					cc: VersionCC,
					nodeId: node.id,
					ccValues: {
						ccCommand: VersionCommand.CommandClassGet,
						// BinarySensorCC needs to be loaded and this makes the import used
						requestedCC: getCommandClassStatic(BinarySensorCC),
					},
				});
			});

			it("should remember the node's supported version", async () => {
				// These CCs need to be implemented or the test will fail
				node.addCC(CommandClasses.Basic, { isSupported: true });
				const expected = new VersionCC(fakeDriver as any, node.id);
				expected.ccCommand = VersionCommand.CommandClassReport;
				expected.requestedCC = CommandClasses.Basic;
				(expected as any)._ccVersion = 3;
				const req = new SendDataRequest(fakeDriver as any);
				req.command = expected;
				fakeDriver.sendMessage.mockResolvedValue(req);

				await node.queryCCVersions();
				expect(node.implementedCommandClasses.get(CommandClasses.Basic).version).toBe(expected.ccVersion);
			});

			it.todo("Test skipping non-implemented CCs");

		});

		describe(`queryEndpoints()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "Endpoints"`, async () => {
				await node.queryEndpoints();
				expect(node.interviewStage).toBe(InterviewStage.Endpoints);
			});

			it("should not send anything if the node does not support the Multi Channel CC", async () => {
				node.addCC(CommandClasses["Multi Channel"], { isSupported: false, isControlled: false });
				await node.queryEndpoints();
				expect(fakeDriver.sendMessage).not.toBeCalled();
			});

			it("should send a MultiChannelCC.EndPointGet", async () => {
				node.addCC(CommandClasses["Multi Channel"], { isSupported: true });
				await node.queryEndpoints();

				expect(fakeDriver.sendMessage).toBeCalled();

				assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
					cc: MultiChannelCC,
					nodeId: node.id,
					ccValues: {
						ccCommand: MultiChannelCommand.EndPointGet,
					},
				});
			});

			it.todo("Test the behavior when the request failed");

			it.todo("Test the behavior when the request succeeds");

		});

		describe(`queryNeighbors()`, () => {

			let expected: GetRoutingInfoResponse;

			beforeAll(() => {
				fakeDriver.sendMessage.mockClear();

				expected = {
					nodeIds: [1, 4, 5],
				} as GetRoutingInfoResponse;
				fakeDriver.sendMessage.mockResolvedValue(expected);
			});

			it("should send a GetRoutingInfoRequest", async () => {
				await node.queryNeighbors();

				expect(fakeDriver.sendMessage).toBeCalled();
				const request: GetRoutingInfoRequest = fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(GetRoutingInfoRequest);
				expect(request.nodeId).toBe(node.id);
			});

			it("should remember the neighbor list", async () => {
				await node.queryNeighbors();
				expect(node.neighbors).toContainAllValues(expected.nodeIds);
			});

			it("should set the interview stage to Neighbors", () => {
				expect(node.interviewStage).toBe(InterviewStage.Neighbors);
			});

		});

		describe("interview sequence", () => {
			let originalMethods: Partial<Record<keyof TestNode, any>>;
			beforeAll(() => {
				const interviewStagesAfter = {
					queryProtocolInfo: InterviewStage.ProtocolInfo,
					ping: InterviewStage.Ping,
					queryNodeInfo: InterviewStage.NodeInfo,
					queryNodePlusInfo: InterviewStage.NodePlusInfo,
					queryManufacturerSpecific: InterviewStage.ManufacturerSpecific,
					queryCCVersions: InterviewStage.Versions,
					queryEndpoints: InterviewStage.Endpoints,
					queryNeighbors: InterviewStage.Neighbors,
					configureWakeup: InterviewStage.WakeUp,
					requestStaticValues: InterviewStage.Static,
				};
				originalMethods = {
					queryProtocolInfo: node.queryProtocolInfo,
					ping: node.ping,
					queryNodeInfo: node.queryNodeInfo,
					queryNodePlusInfo: node.queryNodePlusInfo,
					queryManufacturerSpecific: node.queryManufacturerSpecific,
					queryCCVersions: node.queryCCVersions,
					queryEndpoints: node.queryEndpoints,
					queryNeighbors: node.queryNeighbors,
					configureWakeup: node.configureWakeup,
					requestStaticValues: node.requestStaticValues,
				};
				for (const method of Object.keys(originalMethods)) {
					node[method] = jest.fn()
						.mockName(`${method} mock`)
						.mockImplementation(() => {
							node.interviewStage = interviewStagesAfter[method];
							return Promise.resolve();
						});
				}
			});

			beforeEach(() => {
				for (const method of Object.keys(originalMethods)) {
					node[method].mockClear();
				}
			});

			afterAll(() => {
				for (const method of Object.keys(originalMethods)) {
					node[method] = originalMethods[method];
				}
			});

			it("should execute all the interview methods", async () => {
				node.interviewStage = InterviewStage.None;
				await node.interview();
				for (const method of Object.keys(originalMethods)) {
					expect(node[method]).toBeCalled();
				}
			});

			it("should not execute any interview method if the interview is completed", async () => {
				node.interviewStage = InterviewStage.Complete;
				await node.interview();
				for (const method of Object.keys(originalMethods)) {
					expect(node[method]).not.toBeCalled();
				}
			});

			it("should skip all methods that belong to an earlier stage", async () => {
				node.interviewStage = InterviewStage.NodeInfo;
				await node.interview();

				const expectCalled = [
					"queryNodePlusInfo",
					"queryManufacturerSpecific",
					"queryCCVersions",
					"queryEndpoints",
					"requestStaticValues",
					"configureWakeup",
					"queryNeighbors",
				];
				for (const method of Object.keys(originalMethods)) {
					if (expectCalled.indexOf(method) > -1) {
						expect(node[method]).toBeCalled();
					} else {
						expect(node[method]).not.toBeCalled();
					}
				}
			});

			it.todo("Test restarting from cache");
		});

	});

	describe("isAwake() / setAwake()", () => {

		const fakeDriver = {
			controller: {
				ownNodeId: 1,
				nodes: new Map(),
			},
		};

		function makeNode(supportsWakeUp: boolean = false) {
			const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
			if (supportsWakeUp) node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			fakeDriver.controller.nodes.set(node.id, node);
			return node;
		}

		it("newly created nodes should be assumed awake", () => {
			const node = makeNode();
			expect(node.isAwake()).toBeTrue();
		});

		it("setAwake() should throw if the node does not support Wake Up", () => {
			const node = makeNode();
			assertZWaveError(
				() => node.setAwake(true),
				{ errorCode: ZWaveErrorCodes.CC_NotSupported },
			);
		});

		it("isAwake() should return the status set by setAwake()", () => {
			const node = makeNode(true);
			node.setAwake(false);
			expect(node.isAwake()).toBeFalse();
			node.setAwake(true);
			expect(node.isAwake()).toBeTrue();
		});

		it("setAwake() should not emit any events if emitEvent is false", () => {
			const node = makeNode(true);
			const spy = jest.fn();
			node
				.on("wake up", spy)
				.on("sleep", spy)
				;
			node.setAwake(false, false);
			node.setAwake(true, false);
			expect(spy).not.toBeCalled();
		});

		it(`setAwake() should emit the "wake up" event when the node wakes up and "sleep" when it goes to sleep`, () => {
			const node = makeNode(true);
			const wakeupSpy = jest.fn();
			const sleepSpy = jest.fn();
			node
				.on("wake up", wakeupSpy)
				.on("sleep", sleepSpy)
				;
			for (const { state, expectWakeup, expectSleep } of [
				{ state: false, expectSleep: true, expectWakeup: false },
				{ state: false, expectSleep: false, expectWakeup: false },
				{ state: true, expectSleep: false, expectWakeup: true },
				{ state: true, expectSleep: false, expectWakeup: false },
			]) {
				wakeupSpy.mockClear();
				sleepSpy.mockClear();
				node.setAwake(state);
				expect(wakeupSpy).toBeCalledTimes(expectWakeup ? 1 : 0);
				expect(sleepSpy).toBeCalledTimes(expectSleep ? 1 : 0);
			}
		});

	});

	describe(`sendNoMoreInformation()`, () => {
		const fakeDriver = {
			sendMessage: jest.fn().mockImplementation(() => Promise.resolve()),
			controller: {
				ownNodeId: 1,
				nodes: new Map(),
			},
		};

		function makeNode(supportsWakeUp: boolean = false) {
			const node = new ZWaveNode(2, fakeDriver as unknown as Driver);
			if (supportsWakeUp) node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			fakeDriver.controller.nodes.set(node.id, node);
			return node;
		}

		beforeEach(() => fakeDriver.sendMessage.mockClear());

		it("should not do anything and return false if the node is asleep", async () => {
			const node = makeNode(true);
			node.setAwake(false);

			expect(await node.sendNoMoreInformation()).toBeFalse();
			expect(fakeDriver.sendMessage).not.toBeCalled();
		});

		it("should not do anything and return false if the node interview is not complete", async () => {
			const node = makeNode(false);
			node.interviewStage = InterviewStage.Endpoints;
			expect(await node.sendNoMoreInformation()).toBeFalse();
			expect(fakeDriver.sendMessage).not.toBeCalled();
		});

		it("should send a WakeupCC.NoMoreInformation otherwise", async () => {
			const node = makeNode(false);
			node.interviewStage = InterviewStage.Complete;
			expect(await node.sendNoMoreInformation()).toBeTrue();
			expect(fakeDriver.sendMessage).toBeCalled();

			assertCC(fakeDriver.sendMessage.mock.calls[0][0], {
				cc: WakeUpCC,
				nodeId: node.id,
				ccValues: {
					ccCommand: WakeUpCommand.NoMoreInformation,
				},
			});
		});

		it.todo("Test send failures");

	});

	describe("getCCVersion()", () => {
		it("should return 0 if a command class is not supported", () => {
			const node = new ZWaveNode(2, undefined);
			expect(node.getCCVersion(CommandClasses["Anti-theft"])).toBe(0);
		});

		it("should return the supported version otherwise", () => {
			const node = new ZWaveNode(2, undefined);
			node.addCC(CommandClasses["Anti-theft"], { isSupported: true, version: 5 });
			expect(node.getCCVersion(CommandClasses["Anti-theft"])).toBe(5);
		});
	});

	describe("createCCInstance()", () => {
		it("should throw if the CC is not supported", () => {
			const node = new ZWaveNode(2, undefined);
			assertZWaveError(
				() => node.createCCInstance(CommandClasses.Basic), {
					errorCode: ZWaveErrorCodes.CC_NotSupported,
					messageMatches: "unsupported",
				});
		});

		it("should return a linked instance of the correct CC", () => {
			const fakeDriver = {
				controller: {
					ownNodeId: 1,
					nodes: new Map(),
				},
			};
			const node = new ZWaveNode(2, fakeDriver as any);
			fakeDriver.controller.nodes.set(node.id, node);
			node.addCC(CommandClasses.Basic, { isSupported: true });

			const cc = node.createCCInstance<BasicCC>(CommandClasses.Basic);
			expect(cc).toBeInstanceOf(BasicCC);
			expect(cc.getNode()).toBe(node);
		});
	});

	describe("serialize() / deserialize()", () => {

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
			maxBaudRate: 40000,
			isSecure: false,
			isBeaming: true,
			version: 4,
			commandClasses: {
				"0x25": {
					name: "Binary Switch",
					isSupported: false,
					isControlled: true,
					version: 3,
				},
				"0x26": {
					name: "Multilevel Switch",
					isSupported: false,
					isControlled: true,
					version: 4,
				},
			},
		};

		it("serializing a deserialized node should result in the original object", () => {
			const node = new ZWaveNode(1, undefined);
			node.deserialize(serializedTestNode);
			expect(node.serialize()).toEqual(serializedTestNode);
		});

		it("nodes with a completed interview don't get their stage reset when resuming from cache", () => {
			const node = new ZWaveNode(1, undefined);
			node.deserialize(serializedTestNode);
			node.interviewStage = InterviewStage.RestartFromCache;
			expect(node.serialize().interviewStage).toEqual(InterviewStage[InterviewStage.Complete]);
		});

		it("deserialize() should also accept numbers for the interview stage", () => {
			const input = {
				...serializedTestNode,
				interviewStage: InterviewStage.Dynamic,
			};
			const node = new ZWaveNode(1, undefined);
			node.deserialize(input);
			expect(node.interviewStage).toBe(InterviewStage.Dynamic);
		});

		it("deserialize() should skip the deviceClass if it is malformed", () => {
			const node = new ZWaveNode(1, undefined);
			const brokenDeviceClasses = [
				// not an object
				undefined, 1, "foo",
				// incomplete
				{}, { basic: 1 }, { generic: 2 }, { specific: 3 },
				{ basic: 1, generic: 2 }, { basic: 1, specific: 3 }, { generic: 2, specific: 3 },
				// wrong type
				{ basic: "1", generic: 2, specific: 3 }, { basic: 1, generic: true, specific: 3 }, { basic: 1, generic: 2, specific: {} },
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
		});

		it("deserialize() should skip any primitive properties that have the wrong type", () => {
			const node = new ZWaveNode(1, undefined);
			const wrongInputs: [string, any][] = [
				["isListening", 1],
				["isFrequentListening", "2"],
				["isRouting", {}],
				["maxBaudRate", true],
				["isSecure", 3],
				["isBeaming", "3"],
				["version", false],
			];
			for (const [prop, val] of wrongInputs) {
				const input = {
					...serializedTestNode,
					[prop]: val,
				};
				(node as any)["_" + prop] = undefined;
				node.deserialize(input);
				expect(node[prop]).toBeUndefined();
			}
		});

		it("deserialize() should skip command classes that don't have a HEX key", () => {
			const node = new ZWaveNode(1, undefined);
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
		});

		it("deserialize() should skip command classes that are not known to this library", () => {
			const node = new ZWaveNode(1, undefined);
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
		});

		it("deserialize() should not parse any malformed CC properties", () => {
			const node = new ZWaveNode(1, undefined);
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
		});
	});
});
