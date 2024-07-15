import {
	InvalidCC,
	MultiChannelCCCapabilityGet,
	MultiChannelCCCapabilityReport,
	MultiChannelCCCommandEncapsulation,
	MultiChannelCCEndPointFind,
	MultiChannelCCEndPointFindReport,
	MultiChannelCCEndPointGet,
	MultiChannelCCEndPointReport,
	Security2CC,
	Security2CCCommandsSupportedGet,
	Security2CCCommandsSupportedReport,
	Security2CCMessageEncapsulation,
	Security2CCNonceGet,
	Security2CCNonceReport,
	ZWavePlusCCGet,
} from "@zwave-js/cc";
import {
	CommandClasses,
	SecurityClass,
	SecurityManager2,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { type MockNodeBehavior, MockZWaveFrameType } from "@zwave-js/testing";
import { integrationTest } from "../integrationTestSuite";

integrationTest(
	"Security S2: Communicate with endpoints of secure nodes securely, even if the endpoint does not list S2 as supported",
	{
		// debug: true,

		clearMessageStatsBeforeTest: false,

		nodeCapabilities: {
			// The node supports S2
			commandClasses: [
				{
					ccId: CommandClasses["Z-Wave Plus Info"],
					isSupported: true,
					version: 1,
					secure: true,
				},
				{
					ccId: CommandClasses["Security 2"],
					isSupported: true,
					version: 1,
					secure: true,
				},
				{
					ccId: CommandClasses["Multi Channel"],
					isSupported: true,
					version: 2,
					secure: true,
				},
			],
			// But its endpoints don't list the CC
			endpoints: [
				{
					commandClasses: [
						{
							ccId: CommandClasses["Z-Wave Plus Info"],
							isSupported: true,
							version: 1,
						},
					],
				},
				{
					commandClasses: [
						{
							ccId: CommandClasses["Z-Wave Plus Info"],
							isSupported: true,
							version: 1,
						},
					],
				},
			],
		},

		// We need the cache to skip the CC interviews and mark S2 as supported
		// provisioningDirectory: path.join(__dirname, "fixtures/securityS2"),

		customSetup: async (driver, controller, mockNode) => {
			// Create a security manager for the node
			const smNode = new SecurityManager2();
			// Copy keys from the driver
			// smNode.setKey(
			// 	SecurityClass.S2_AccessControl,
			// 	driver.options.securityKeys!.S2_AccessControl!,
			// );
			// smNode.setKey(
			// 	SecurityClass.S2_Authenticated,
			// 	driver.options.securityKeys!.S2_Authenticated!,
			// );
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
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof Security2CCNonceGet) {
						const nonce = smNode.generateNonce(
							controller.host.ownNodeId,
						);
						const cc = new Security2CCNonceReport(self.host, {
							nodeId: controller.host.ownNodeId,
							SOS: true,
							MOS: false,
							receiverEI: nonce,
						});
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToNonceGet);

			// Handle decode errors
			const handleInvalidCC: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (receivedCC instanceof InvalidCC) {
						if (
							receivedCC.reason
								=== ZWaveErrorCodes.Security2CC_CannotDecode
							|| receivedCC.reason
								=== ZWaveErrorCodes.Security2CC_NoSPAN
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
							return { action: "sendCC", cc };
						}
					}
				},
			};
			mockNode.defineBehavior(handleInvalidCC);

			// The node was granted the S2_Unauthenticated key
			const respondToS2CommandsSupportedGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof Security2CCCommandsSupportedGet
					) {
						const isHighestGranted = receivedCC.securityClass
							=== self.host.getHighestSecurityClass(self.id);

						const cc = Security2CC.encapsulate(
							self.host,
							new Security2CCCommandsSupportedReport(self.host, {
								nodeId: controller.host.ownNodeId,
								supportedCCs: isHighestGranted
									? [...mockNode.implementedCCs.entries()]
										.filter(
											([ccId, info]) =>
												info.secure
												&& ccId
													!== CommandClasses[
														"Security 2"
													],
										)
										.map(([ccId]) => ccId)
									: [],
							}),
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS2CommandsSupportedGet);

			const respondToS2MultiChannelCCEndPointGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof MultiChannelCCEndPointGet
					) {
						const cc = Security2CC.encapsulate(
							self.host,
							new MultiChannelCCEndPointReport(self.host, {
								nodeId: controller.host.ownNodeId,
								countIsDynamic: false,
								identicalCapabilities: false,
								individualCount: self.endpoints.size,
							}),
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS2MultiChannelCCEndPointGet);

			const respondToS2MultiChannelCCEndPointFind: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof MultiChannelCCEndPointFind
					) {
						const request = receivedCC.encapsulated;
						const cc = Security2CC.encapsulate(
							self.host,
							new MultiChannelCCEndPointFindReport(self.host, {
								nodeId: controller.host.ownNodeId,
								genericClass: request.genericClass,
								specificClass: request.specificClass,
								foundEndpoints: [...self.endpoints.keys()],
								reportsToFollow: 0,
							}),
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS2MultiChannelCCEndPointFind);

			const respondToS2MultiChannelCCCapabilityGet: MockNodeBehavior = {
				handleCC(controller, self, receivedCC) {
					if (
						receivedCC
							instanceof Security2CCMessageEncapsulation
						&& receivedCC.encapsulated
							instanceof MultiChannelCCCapabilityGet
					) {
						const endpoint = self.endpoints.get(
							receivedCC.encapsulated.requestedEndpoint,
						)!;
						const cc = Security2CC.encapsulate(
							self.host,
							new MultiChannelCCCapabilityReport(self.host, {
								nodeId: controller.host.ownNodeId,
								endpointIndex: endpoint.index,
								genericDeviceClass:
									endpoint?.capabilities.genericDeviceClass
										?? self.capabilities.genericDeviceClass,
								specificDeviceClass: endpoint?.capabilities
									.specificDeviceClass
									?? self.capabilities.specificDeviceClass,
								isDynamic: false,
								wasRemoved: false,
								supportedCCs: [
									...endpoint.implementedCCs.keys(),
								],
							}),
						);
						return { action: "sendCC", cc };
					}
				},
			};
			mockNode.defineBehavior(respondToS2MultiChannelCCCapabilityGet);
		},

		testBody: async (t, driver, node, mockController, mockNode) => {
			// The interview should request Z-Wave+ info from both endpoints securely
			mockNode.assertReceivedControllerFrame(
				(msg) =>
					msg.type === MockZWaveFrameType.Request
					&& msg.payload instanceof Security2CCMessageEncapsulation
					&& msg.payload.encapsulated
						instanceof MultiChannelCCCommandEncapsulation
					&& msg.payload.encapsulated.destination === 1
					&& msg.payload.encapsulated.encapsulated
						instanceof ZWavePlusCCGet,
				{
					errorMessage:
						"Expected communication with endpoint 1 to be secure",
				},
			);
			mockNode.assertReceivedControllerFrame(
				(msg) =>
					msg.type === MockZWaveFrameType.Request
					&& msg.payload instanceof Security2CCMessageEncapsulation
					&& msg.payload.encapsulated
						instanceof MultiChannelCCCommandEncapsulation
					&& msg.payload.encapsulated.destination === 2
					&& msg.payload.encapsulated.encapsulated
						instanceof ZWavePlusCCGet,
				{
					errorMessage:
						"Expected communication with endpoint 2 to be secure",
				},
			);
			t.pass();
		},
	},
);
