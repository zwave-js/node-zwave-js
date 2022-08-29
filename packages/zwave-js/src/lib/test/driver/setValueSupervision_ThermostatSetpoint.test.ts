import {
	CommandClass,
	InvalidCC,
	Security2CC,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	SupervisionCCGet,
	SupervisionCCReport,
	ThermostatSetpointCCValues,
	ThermostatSetpointType,
} from "@zwave-js/cc";
import {
	SecurityClass,
	SecurityManager2,
	SupervisionStatus,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	createMockZWaveRequestFrame,
	MockNodeBehavior,
	MockZWaveFrameType,
} from "@zwave-js/testing";
import { wait } from "alcalzone-shared/async";
import path from "path";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Regression test for #4957: Value update after supervised Thermostat Setpoint Set",
	{
		debug: true,
		provisioningDirectory: path.join(
			__dirname,
			"fixtures/thermostatS2Supervision",
		),

		// nodeCapabilities: {
		// 	commandClasses: [
		// 		CommandClasses["Thermostat Setpoint"],
		// 		CommandClasses.Supervision,
		// 	],
		// },

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const smNode = new SecurityManager2();
			// Copy keys from the driver
			smNode.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smNode.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smNode.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			mockNode.host.securityManager2 = smNode;
			mockNode.host.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Create a security manager for the controller
			const smCtrlr = new SecurityManager2();
			// Copy keys from the driver
			smCtrlr.setKey(
				SecurityClass.S2_AccessControl,
				driver.options.securityKeys!.S2_AccessControl!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Authenticated,
				driver.options.securityKeys!.S2_Authenticated!,
			);
			smCtrlr.setKey(
				SecurityClass.S2_Unauthenticated,
				driver.options.securityKeys!.S2_Unauthenticated!,
			);
			controller.host.securityManager2 = smCtrlr;
			controller.host.getHighestSecurityClass = () =>
				SecurityClass.S2_Unauthenticated;

			// Respond to Nonce Get
			const respondToNonceGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof Security2CCNonceGet
					) {
						const nonce = smNode.generateNonce(
							controller.host.ownNodeId,
						);
						const cc = new Security2CCNonceReport(self.host, {
							nodeId: controller.host.ownNodeId,
							SOS: true,
							MOS: false,
							receiverEI: nonce,
						});
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(respondToNonceGet);

			// Handle decode errors
			const handleInvalidCC: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof InvalidCC
					) {
						if (
							frame.payload.reason ===
								ZWaveErrorCodes.Security2CC_CannotDecode ||
							frame.payload.reason ===
								ZWaveErrorCodes.Security2CC_NoSPAN
						) {
							const nonce = smNode.generateNonce(
								controller.host.ownNodeId,
							);
							const cc = new Security2CCNonceReport(self.host, {
								nodeId: controller.host.ownNodeId,
								SOS: true,
								MOS: false,
								receiverEI: nonce,
							});
							await self.sendToController(
								createMockZWaveRequestFrame(cc, {
									ackRequested: false,
								}),
							);
							return true;
						}
					}
					return false;
				},
			};
			mockNode.defineBehavior(handleInvalidCC);

			// Just have the node respond to all Supervision Get positively
			const respondToSupervisionGet: MockNodeBehavior = {
				async onControllerFrame(controller, self, frame) {
					if (
						frame.type === MockZWaveFrameType.Request &&
						frame.payload instanceof
							Security2CCMessageEncapsulation &&
						frame.payload.encapsulated instanceof SupervisionCCGet
					) {
						let cc: CommandClass = new SupervisionCCReport(
							self.host,
							{
								nodeId: controller.host.ownNodeId,
								sessionId: frame.payload.encapsulated.sessionId,
								moreUpdatesFollow: false,
								status: SupervisionStatus.Success,
							},
						);
						cc = Security2CC.encapsulate(self.host, cc);
						await self.sendToController(
							createMockZWaveRequestFrame(cc, {
								ackRequested: false,
							}),
						);
						return true;
					}
					return false;
				},
			};
			mockNode.defineBehavior(respondToSupervisionGet);
		},
		testBody: async (_driver, node, _mockController, _mockNode) => {
			const onValueChange = jest.fn();
			node.on("value added", onValueChange);
			node.on("value updated", onValueChange);

			const setpointValueId = ThermostatSetpointCCValues.setpoint(
				ThermostatSetpointType.Cooling,
			).id;
			await node.setValue(setpointValueId, 20);

			await wait(500);

			const setpoint = node.getValue(setpointValueId);
			expect(setpoint).toBe(20);

			// And make sure the value event handlers are called
			expect(onValueChange).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({
					property: setpointValueId.property,
					propertyKey: setpointValueId.propertyKey,
					newValue: 20,
				}),
			);
		},
	},
);
