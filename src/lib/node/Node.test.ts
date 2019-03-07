import { assertZWaveError } from "../../../test/util";
import { CommandClasses } from "../commandclass/CommandClass";
import { NoOperationCC } from "../commandclass/NoOperationCC";
import { WakeUpCC } from "../commandclass/WakeUpCC";
import { GetNodeProtocolInfoRequest, GetNodeProtocolInfoResponse } from "../controller/GetNodeProtocolInfoMessages";
import { SendDataRequest } from "../controller/SendDataMessages";
import { Driver } from "../driver/Driver";
import { ZWaveErrorCodes } from "../error/ZWaveError";
import { BasicDeviceClasses, DeviceClass, GenericDeviceClass, GenericDeviceClasses, SpecificDeviceClass } from "./DeviceClass";
import { InterviewStage, ZWaveNode } from "./Node";
import { ValueDB } from "./ValueDB";

/** This is an ugly hack to be able to test the private methods without resorting to @internal */
class TestNode extends ZWaveNode {

	public async queryProtocolInfo() {
		return super.queryProtocolInfo();
	}
	public async waitForWakeup() {
		return super.waitForWakeup();
	}
	public async ping() {
		return super.ping();
	}
	public async queryNodeInfo() {
		return super.queryNodeInfo();
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
	public async requestStaticValues() {
		return super.requestStaticValues();
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

			beforeAll(() => fakeDriver.sendMessage.mockClear());

			const expected = {
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
				await node.waitForWakeup();
				expect(node.interviewStage).toBe(InterviewStage.WakeUp);
			});

			it("should not send anything if the node does not support WakeUp", async () => {
				// Temporarily mark Wake Up as not supported
				node.addCC(CommandClasses["Wake Up"], { isSupported: false });
				await node.waitForWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				node.addCC(CommandClasses["Wake Up"], { isSupported: true });
			});

			it("should not send anything if the node is the controller", async () => {
				// Temporarily make this node the controller node
				fakeDriver.controller.ownNodeId = node.id;
				await node.waitForWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				fakeDriver.controller.ownNodeId = 1;
			});

			it("should not send anything if the node is frequent listening", async () => {
				// Temporarily make this node frequent listening
				(node as any)._isFrequentListening = true;
				await node.waitForWakeup();
				expect(fakeDriver.sendMessage).not.toBeCalled();
				(node as any)._isFrequentListening = false;
			});

			it("should send a Wake Up CC and wait for the response", async () => {
				await node.waitForWakeup();
				expect(fakeDriver.sendMessage).toBeCalled();
				const request: SendDataRequest = fakeDriver.sendMessage.mock.calls[0][0];
				expect(request).toBeInstanceOf(SendDataRequest);
				expect(request.command).toBeInstanceOf(WakeUpCC);
				expect(request.getNodeId()).toBe(node.id);
			});
		});

		describe(`ping()`, () => {
			beforeAll(() => fakeDriver.sendMessage.mockImplementation(() => Promise.resolve()));
			beforeEach(() => fakeDriver.sendMessage.mockClear());

			it(`should set the interview stage to "Ping"`, async () => {
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
			for (const {state, expectWakeup, expectSleep} of [
				{state: false, expectSleep: true, expectWakeup: false},
				{state: false, expectSleep: false, expectWakeup: false},
				{state: true, expectSleep: false, expectWakeup: true},
				{state: true, expectSleep: false, expectWakeup: false},
			]) {
				wakeupSpy.mockClear();
				sleepSpy.mockClear();
				node.setAwake(state);
				expect(wakeupSpy).toBeCalledTimes(expectWakeup ? 1 : 0);
				expect(sleepSpy).toBeCalledTimes(expectSleep ? 1 : 0);
			}
		});

	});
});
