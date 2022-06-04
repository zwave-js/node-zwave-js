import {
	CommandClasses,
	ValueID,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { MockController, MockNode } from "@zwave-js/testing";
import { createDefaultMockControllerBehaviors } from "../../Utils";
import { AssociationCCReport } from "../commandclass/AssociationCC";
import { BasicCCSet } from "../commandclass/BasicCC";
import { FirmwareUpdateMetaDataCC } from "../commandclass/FirmwareUpdateMetaDataCC";
import { MultiChannelCCCommandEncapsulation } from "../commandclass/MultiChannelCC";
import { MultiCommandCCCommandEncapsulation } from "../commandclass/MultiCommandCC";
import { SecurityCCCommandEncapsulation } from "../commandclass/SecurityCC";
import { WakeUpCCIntervalSet } from "../commandclass/WakeUpCC";
import { AssociationCommand } from "../commandclass/_Types";
import { TransmitOptions } from "../controller/_Types";
import { ZWaveNode } from "../node/Node";
import { ApplicationCommandRequest } from "../serialapi/application/ApplicationCommandRequest";
import { SendDataRequest } from "../serialapi/transport/SendDataMessages";
import type { Driver } from "./Driver";
import { createAndStartTestingDriver } from "./DriverMock";

describe("lib/driver/Driver", () => {
	describe("receiving messages", () => {
		let driver: Driver;
		let controller: MockController;

		beforeEach(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				// We don't need a real interview for this
				skipControllerIdentification: true,
				skipNodeInterview: true,
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
				},
			}));
		}, 30000);

		afterEach(async () => {
			await driver.destroy();
			driver.removeAllListeners();
		});

		it("should not crash if a message is received that cannot be deserialized", async () => {
			const req = new ApplicationCommandRequest(driver, {
				command: new WakeUpCCIntervalSet(driver, {
					nodeId: 1,
					controllerNodeId: 2,
					wakeUpInterval: 5,
				}),
			});
			controller.serial.emitData(req.serialize());
			await controller.expectHostACK(1000);
		});

		it("should correctly handle multiple messages in the receive buffer", async () => {
			// This buffer contains a SendData transmit report and a ManufacturerSpecific report
			const data = Buffer.from(
				"010700130f000002e6010e000400020872050086000200828e",
				"hex",
			);
			controller.serial.emitData(data);

			// Ensure the driver ACKed two messages
			await controller.expectHostACK(1000);
			await controller.expectHostACK(1000);
		});
	});

	describe("getNextCallbackId()", () => {
		let driver: Driver;

		beforeEach(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipControllerIdentification: true,
				skipNodeInterview: true,
			}));
		}, 30000);

		afterEach(async () => {
			await driver.destroy();
			driver.removeAllListeners();
		});

		it("the automatically created callback ID should be incremented and wrap from 0xff back to 10", () => {
			let lastCallbackId: number | undefined;
			for (let i = 0; i <= 300; i++) {
				if (i === 300) {
					throw new Error(
						"incrementing the callback ID does not work somehow",
					);
				}
				const nextCallbackId = driver.getNextCallbackId();
				if (lastCallbackId === 0xff) {
					expect(nextCallbackId).toBe(1);
					break;
				} else if (lastCallbackId != null) {
					expect(nextCallbackId).toBe(lastCallbackId + 1);
				}
				lastCallbackId = nextCallbackId;
			}
		});
	});

	describe("computeNetCCPayloadSize()", () => {
		let driver: Driver;
		let controller: MockController;

		beforeEach(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				securityKeys: {
					S0_Legacy: Buffer.alloc(16, 0xff),
				},
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
				},
			}));
		}, 30000);

		afterEach(async () => {
			await driver.destroy();
			driver.removeAllListeners();
		});

		it("should compute the correct net payload sizes", () => {
			const testMsg1 = new SendDataRequest(driver, {
				command: new SecurityCCCommandEncapsulation(driver, {
					nodeId: 2,
					encapsulated: {} as any,
				}),
				transmitOptions: TransmitOptions.DEFAULT,
			});
			testMsg1.command.encapsulated = undefined as any;
			expect(driver.computeNetCCPayloadSize(testMsg1)).toBe(26);

			const multiChannelCC = new MultiChannelCCCommandEncapsulation(
				driver,
				{
					nodeId: 2,
					destination: 1,
					encapsulated: {} as any,
				},
			);
			const testMsg2 = new SendDataRequest(driver, {
				command: new SecurityCCCommandEncapsulation(driver, {
					nodeId: 2,
					encapsulated: multiChannelCC,
				}),
				transmitOptions: TransmitOptions.NoRoute,
			});
			multiChannelCC.encapsulated = undefined as any;
			expect(driver.computeNetCCPayloadSize(testMsg2)).toBe(54 - 20 - 4);

			const testMsg3 = new FirmwareUpdateMetaDataCC(driver, {
				nodeId: 2,
			});
			testMsg3.secure = true;
			expect(driver.computeNetCCPayloadSize(testMsg3)).toBe(46 - 20 - 2);
		});
	});

	describe("assemblePartialCCs()", () => {
		let driver: Driver;
		let controller: MockController;

		beforeEach(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				securityKeys: {
					S0_Legacy: Buffer.alloc(16, 0xff),
				},
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
					const node2 = new MockNode({
						id: 2,
						controller,
					});
					controller.nodes.set(node2.id, node2);
				},
			}));
		}, 30000);

		afterEach(async () => {
			await driver.destroy();
			driver.removeAllListeners();
		});

		it("returns true when a non-partial CC is received", async () => {
			const cc = new BasicCCSet(driver, { nodeId: 2, targetValue: 50 });
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns true when a partial CC is received that expects no more reports", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns false when a partial CC is received that expects more reports", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					1, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns true when the final partial CC is received and merges its data", async () => {
			const cc1 = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					1, // reportsFollow
					1,
					2,
					3,
				]),
			});
			const cc2 = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					4,
					5,
					6,
				]),
			});
			const msg1 = new ApplicationCommandRequest(driver, {
				command: cc1,
			});
			expect(driver["assemblePartialCCs"](msg1)).toBeFalse();

			const msg2 = new ApplicationCommandRequest(driver, {
				command: cc2,
			});
			expect(driver["assemblePartialCCs"](msg2)).toBeTrue();

			expect((msg2.command as AssociationCCReport).nodeIds).toEqual([
				1, 2, 3, 4, 5, 6,
			]);
		});

		it("does not crash when receiving a Multi Command CC", async () => {
			const cc1 = new BasicCCSet(driver, { nodeId: 2, targetValue: 25 });
			const cc2 = new BasicCCSet(driver, { nodeId: 2, targetValue: 50 });
			const cc = new MultiCommandCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: [cc1, cc2],
			});
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("supports nested partial/non-partial CCs", async () => {
			const cc1 = new BasicCCSet(driver, { nodeId: 2, targetValue: 25 });
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: {} as any,
			});
			cc.encapsulated = undefined as any;
			cc["decryptedCCBytes"] = cc1.serialize();
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("supports nested partial/partial CCs (part 1)", async () => {
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: {} as any,
			});
			cc.encapsulated = undefined as any;
			cc["decryptedCCBytes"] = Buffer.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				1, // reportsFollow
				1,
				2,
				3,
			]);
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("supports nested partial/partial CCs (part 2)", async () => {
			const cc = new SecurityCCCommandEncapsulation(driver, {
				nodeId: 2,
				encapsulated: {} as any,
			});
			cc.encapsulated = undefined as any;
			cc["decryptedCCBytes"] = Buffer.from([
				CommandClasses.Association,
				AssociationCommand.Report,
				1,
				2,
				0, // reportsFollow
				1,
				2,
				3,
			]);
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeTrue();
		});

		it("returns false when a partial CC throws Deserialization_NotImplemented during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc.mergePartialCCs = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.Deserialization_NotImplemented,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns false when a partial CC throws CC_NotImplemented during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc.mergePartialCCs = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.CC_NotImplemented,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("returns false when a partial CC throws PacketFormat_InvalidPayload during merging", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc.mergePartialCCs = () => {
				throw new ZWaveError(
					"not implemented",
					ZWaveErrorCodes.PacketFormat_InvalidPayload,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(driver["assemblePartialCCs"](msg)).toBeFalse();
		});

		it("passes other errors during merging through", async () => {
			const cc = new AssociationCCReport(driver, {
				nodeId: 2,
				data: Buffer.from([
					CommandClasses.Association,
					AssociationCommand.Report,
					1,
					2,
					0, // reportsFollow
					1,
					2,
					3,
				]),
			});
			cc.mergePartialCCs = () => {
				throw new ZWaveError(
					"invalid",
					ZWaveErrorCodes.Argument_Invalid,
				);
			};
			const msg = new ApplicationCommandRequest(driver, {
				command: cc,
			});
			expect(() => driver["assemblePartialCCs"](msg)).toThrow("invalid");
		});
	});

	describe("hasPendingMessages()", () => {
		let driver: Driver;
		let node2: ZWaveNode;
		let controller: MockController;

		beforeEach(async () => {
			({ driver } = await createAndStartTestingDriver({
				loadConfiguration: false,
				skipNodeInterview: true,
				beforeStartup(mockPort) {
					controller = new MockController({ serial: mockPort });
					controller.defineBehavior(
						...createDefaultMockControllerBehaviors(),
					);
				},
			}));
			node2 = new ZWaveNode(2, driver);
			(driver.controller.nodes as any as Map<any, any>).set(
				node2.id,
				node2,
			);
		}, 30000);

		afterEach(async () => {
			await driver.destroy();
			driver.removeAllListeners();
		});

		it("should return true when there is a poll scheduled for a node", () => {
			expect(driver["hasPendingMessages"](node2)).toBeFalse();
			const valueId: ValueID = {
				commandClass: CommandClasses.Basic,
				property: "currentValue",
			};
			node2.schedulePoll(valueId, { timeoutMs: 1000 });
			expect(driver["hasPendingMessages"](node2)).toBeTrue();
			node2.cancelScheduledPoll(valueId);
			expect(driver["hasPendingMessages"](node2)).toBeFalse();
		});
	});
});
