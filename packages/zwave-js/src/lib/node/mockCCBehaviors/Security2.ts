import {
	CommandClass,
	ECDHProfiles,
	InvalidCC,
	KEXSchemes,
	Security2CC,
	Security2CCCommandsSupportedGet,
	Security2CCCommandsSupportedReport,
	Security2CCKEXGet,
	Security2CCKEXReport,
	Security2CCKEXSet,
	Security2CCMessageEncapsulation,
	Security2CCNetworkKeyGet,
	Security2CCNetworkKeyReport,
	Security2CCNetworkKeyVerify,
	Security2CCNonceGet,
	Security2CCNonceReport,
	Security2CCPublicKeyReport,
	Security2CCTransferEnd,
	Security2Command,
} from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type SecurityClass,
	ZWaveErrorCodes,
	computePRK,
	deriveSharedECDHSecret,
	deriveTempKeys,
} from "@zwave-js/core";
import { type BytesView } from "@zwave-js/shared";
import {
	type MockController,
	type MockNode,
	type MockNodeBehavior,
	type MockNodeResponse,
	type MockZWaveFrame,
	MockZWaveFrameType,
	createMockZWaveRequestFrame,
} from "@zwave-js/testing";

enum BootstrapStage {
	Started,
	Handshake,
	RequestingKeys,
	VerifyingKeys,
	Finalizing,
}

type Security2BootstrapState =
	| {
			stage: BootstrapStage.Started;
	  }
	| {
			stage: BootstrapStage.Handshake;
			grantedKeys: SecurityClass[];
	  }
	| {
			stage: BootstrapStage.RequestingKeys | BootstrapStage.Finalizing;
			grantedKeys: SecurityClass[];
			keys: Map<SecurityClass, BytesView>;
	  }
	| {
			stage: BootstrapStage.VerifyingKeys;
			grantedKeys: SecurityClass[];
			keys: Map<SecurityClass, BytesView>;
			currentKey: SecurityClass;
	  };

const STATE_KEY_PREFIX = "Security2_";
const StateKeys = {
	bootstrapState: `${STATE_KEY_PREFIX}bootstrapState`,
} as const;

const respondToS2KEXGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (receivedCC instanceof Security2CCKEXGet) {
			// Reset the bootstrap state
			self.state.set(StateKeys.bootstrapState, {
				stage: BootstrapStage.Started,
			});

			const cc = new Security2CCKEXReport({
				nodeId: controller.ownNodeId,
				echo: false,
				supportedKEXSchemes: [KEXSchemes.KEXScheme1],
				supportedECDHProfiles: [ECDHProfiles.Curve25519],
				requestCSA: false,
				requestedKeys: [...self.capabilities.securityClasses],
			});

			return { action: "sendCC", cc };
		}
	},
};

const respondToS2KEXSet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (receivedCC instanceof Security2CCKEXSet && !receivedCC.echo) {
			// Remember the granted keys
			self.state.set(StateKeys.bootstrapState, {
				stage: BootstrapStage.Handshake,
				grantedKeys: receivedCC.grantedKeys,
			});

			// We're supposed to respond with our public key now
			const cc = new Security2CCPublicKeyReport({
				nodeId: controller.ownNodeId,
				includingNode: false,
				publicKey: self.ecdhKeyPair.publicKey,
			});
			return { action: "sendCC", cc };
		}
	},
};

const respondToS2KEXReport: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (
			receivedCC instanceof Security2CCKEXReport
			&& receivedCC.echo
			&& receivedCC.isEncapsulatedWith(CommandClasses["Security 2"])
		) {
			// This should happen after the "handshake"
			const currentState = self.state.get(StateKeys.bootstrapState) as
				| Security2BootstrapState
				| undefined;
			if (currentState?.stage !== BootstrapStage.Handshake) return;

			// We are now ready to request the network keys
			self.state.set(StateKeys.bootstrapState, {
				stage: BootstrapStage.RequestingKeys,
				grantedKeys: currentState.grantedKeys,
				keys: new Map(),
			});

			// Kick off the key request process using the first key
			const firstKey = currentState.grantedKeys[0];
			return requestKey(self, firstKey);
		}
		return undefined;
	},
};

const handleS2PublicKeyReport: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (
			receivedCC instanceof Security2CCPublicKeyReport
			&& receivedCC.includingNode
		) {
			// Derive the shared secret and temp keys
			const sharedSecret = await deriveSharedECDHSecret({
				publicKey: receivedCC.publicKey,
				privateKey: self.ecdhKeyPair.privateKey,
			});

			const tempKeys = await deriveTempKeys(
				await computePRK(
					sharedSecret,
					receivedCC.publicKey,
					self.ecdhKeyPair.publicKey,
				),
			);

			sm2Node.deleteNonce(controller.ownNodeId);
			sm2Node.tempKeys.set(controller.ownNodeId, {
				keyCCM: tempKeys.tempKeyCCM,
				personalizationString: tempKeys.tempPersonalizationString,
			});

			// The mock node does not have the magic for automatically
			// initializing the SPAN state, so we have to do it ourselves here.
			// This requires a nonce exchange.
			await requestNonce(controller, self);

			// Send the KEX Set echo to finalize creation of the secure channel
			let cc: CommandClass = new Security2CCKEXSet({
				nodeId: controller.ownNodeId,
				echo: true,
				// TODO: We should copy these from the received KEX Set instead
				selectedKEXScheme: KEXSchemes.KEXScheme1,
				selectedECDHProfile: ECDHProfiles.Curve25519,
				permitCSA: false,
				grantedKeys: [...self.capabilities.securityClasses],
			});
			cc = Security2CC.encapsulate(cc, self.id, self.securityManagers);

			return { action: "sendCC", cc };
		}
	},
};

const handleS2NetworkKeyReport: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (
			receivedCC instanceof Security2CCNetworkKeyReport
			&& receivedCC.isEncapsulatedWith(CommandClasses["Security 2"])
		) {
			// Ensure we are in the "requesting keys" stage
			const currentState = self.state.get(StateKeys.bootstrapState) as
				| Security2BootstrapState
				| undefined;
			if (currentState?.stage !== BootstrapStage.RequestingKeys) return;

			// Remember the key
			currentState.keys.set(receivedCC.grantedKey, receivedCC.networkKey);

			// And temporarily use it for verification
			self.encodingContext.setSecurityClass(
				controller.ownNodeId,
				receivedCC.grantedKey,
				true,
			);
			await sm2Node.setKey(receivedCC.grantedKey, receivedCC.networkKey);

			// Verify the key
			self.state.set(StateKeys.bootstrapState, {
				...currentState,
				stage: BootstrapStage.VerifyingKeys,
				currentKey: receivedCC.grantedKey,
			});
			await requestNonce(controller, self);
			return verifyKey(self, receivedCC.grantedKey);
		}
	},
};

async function requestNonce(
	controller: MockController,
	self: MockNode,
): Promise<BytesView> {
	const nonceGet = new Security2CCNonceGet({
		nodeId: controller.ownNodeId,
	});
	await self.sendToController(
		createMockZWaveRequestFrame(nonceGet, {
			ackRequested: false,
		}),
	);

	const nonceReport = await self.expectControllerFrame(
		(
			resp,
		): resp is MockZWaveFrame & {
			type: MockZWaveFrameType.Request;
			payload: Security2CCNonceReport;
		} =>
			resp.type === MockZWaveFrameType.Request
			&& resp.payload instanceof Security2CCNonceReport
			&& resp.payload.SOS,
		{ timeout: 1000 },
	);

	return nonceReport.payload.receiverEI!;
}

// Returns the mock node action for requesting a network key
function requestKey(self: MockNode, secClass: SecurityClass): MockNodeResponse {
	let networkKeyGet: CommandClass = new Security2CCNetworkKeyGet({
		nodeId: self.controller.ownNodeId,
		requestedKey: secClass,
	});
	networkKeyGet = Security2CC.encapsulate(
		networkKeyGet,
		self.id,
		self.securityManagers,
	);

	return { action: "sendCC", cc: networkKeyGet };
}

// Returns the mock node action for verifying a network key
function verifyKey(self: MockNode, secClass: SecurityClass): MockNodeResponse {
	let networkKeyVerify: CommandClass = new Security2CCNetworkKeyVerify({
		nodeId: self.controller.ownNodeId,
	});
	networkKeyVerify = Security2CC.encapsulate(
		networkKeyVerify,
		self.id,
		self.securityManagers,
		{ securityClass: secClass },
	);
	return { action: "sendCC", cc: networkKeyVerify };
}

const handleS2TransferEnd: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (
			receivedCC instanceof Security2CCTransferEnd
			&& receivedCC.keyVerified
			&& !receivedCC.keyRequestComplete
			&& receivedCC.isEncapsulatedWith(CommandClasses["Security 2"])
		) {
			// Ensure we are in the "requesting keys" stage
			const currentState = self.state.get(StateKeys.bootstrapState) as
				| Security2BootstrapState
				| undefined;
			if (currentState?.stage !== BootstrapStage.RequestingKeys) return;

			const nextKey = currentState.grantedKeys[currentState.keys.size];

			if (nextKey) {
				// Request the next key
				return requestKey(self, nextKey);
			}

			// We're done. The next command still needs to use the temporary
			// key though, so we cannot restore the security manager etc.
			// just yet.
			currentState.stage = BootstrapStage.Finalizing;

			let transferEnd: CommandClass = new Security2CCTransferEnd({
				nodeId: controller.ownNodeId,
				keyVerified: false,
				keyRequestComplete: true,
			});
			transferEnd = Security2CC.encapsulate(
				transferEnd,
				self.id,
				self.securityManagers,
			);
			return { action: "sendCC", cc: transferEnd };

			// The next communication attempt from the controller will
			// need a NonceGet, at which point we'll restore the security
			// manager etc.
		}
	},
};

// Create a new nonce when asked for
const respondToS2NonceGet: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (receivedCC instanceof Security2CCNonceGet) {
			const bootstrapState = self.state.get(StateKeys.bootstrapState) as
				| Security2BootstrapState
				| undefined;

			if (bootstrapState?.stage === BootstrapStage.VerifyingKeys) {
				// This is the NonceGet after sending the NetworkKeyVerify.
				// The next command will use the temporary key again,
				// so we need to reset the security manager for that.
				self.encodingContext.setSecurityClass(
					controller.ownNodeId,
					bootstrapState.currentKey,
					false,
				);
				sm2Node.deleteNonce(controller.ownNodeId);

				// Reset the state back to requesting keys
				self.state.set(StateKeys.bootstrapState, {
					stage: BootstrapStage.RequestingKeys,
					grantedKeys: bootstrapState.grantedKeys,
					keys: bootstrapState.keys,
				});
			} else if (bootstrapState?.stage === BootstrapStage.Finalizing) {
				// Bootstrapping is now actually done. Restore all keys
				// and security manager settings, so the communication uses
				// the correct security classes from now on.
				for (const [secClass, key] of bootstrapState.keys) {
					self.encodingContext.setSecurityClass(
						controller.ownNodeId,
						secClass,
						true,
					);
					self.encodingContext.setSecurityClass(
						self.id,
						secClass,
						true,
					);
					await sm2Node.setKey(secClass, key);

					sm2Node.tempKeys.delete(controller.ownNodeId);
					sm2Node.deleteNonce(controller.ownNodeId);
				}

				self.state.delete(StateKeys.bootstrapState);
			}

			const nonce = await sm2Node.generateNonce(controller.ownNodeId);
			const cc = new Security2CCNonceReport({
				nodeId: controller.ownNodeId,
				SOS: true,
				MOS: false,
				receiverEI: nonce,
			});
			return { action: "sendCC", cc };
		}
	},
};

// Handle decode errors
const handleS2DecodeError: MockNodeBehavior = {
	async handleCC(controller, self, receivedCC) {
		const sm2Node = self.securityManagers.securityManager2;
		if (!sm2Node) return;

		if (receivedCC instanceof InvalidCC) {
			if (
				receivedCC.reason === ZWaveErrorCodes.Security2CC_CannotDecode
				|| receivedCC.reason === ZWaveErrorCodes.Security2CC_NoSPAN
			) {
				const nonce = await sm2Node.generateNonce(controller.ownNodeId);
				const cc = new Security2CCNonceReport({
					nodeId: controller.ownNodeId,
					SOS: true,
					MOS: false,
					receiverEI: nonce,
				});
				return { action: "sendCC", cc };
			}
		}
	},
};

const respondToS2CommandsSupportedGet: MockNodeBehavior = {
	handleCC(controller, self, receivedCC) {
		if (receivedCC instanceof Security2CCCommandsSupportedGet) {
			const encapCC = receivedCC.getEncapsulatingCC(
				CommandClasses["Security 2"],
				Security2Command.MessageEncapsulation,
			) as Security2CCMessageEncapsulation | undefined;
			if (!encapCC) return;

			const isHighestGranted =
				encapCC.securityClass
				=== self.encodingContext.getHighestSecurityClass(self.id);

			const cc = Security2CC.encapsulate(
				new Security2CCCommandsSupportedReport({
					nodeId: controller.ownNodeId,
					supportedCCs: isHighestGranted
						? [...self.implementedCCs.entries()]
								.filter(
									([ccId, info]) =>
										info.secure
										&& ccId
											!== CommandClasses["Security 2"],
								)
								.map(([ccId]) => ccId)
						: [],
				}),
				self.id,
				self.securityManagers,
			);
			return { action: "sendCC", cc };
		}
	},
};

// Parse and unwrap Security2 CC commands.
const encapsulateS2CC: MockNodeBehavior = {
	async transformIncomingCC(controller, self, receivedCC) {
		if (
			receivedCC instanceof Security2CCMessageEncapsulation
			&& receivedCC.encapsulated
		) {
			receivedCC.encapsulated?.toggleEncapsulationFlag(
				EncapsulationFlags.Security,
				true,
			);
			return receivedCC.encapsulated;
		}

		return receivedCC;
	},

	async transformResponse(controller, self, receivedCC, response) {
		// Ensure that responses to S2-encapsulated CCs are also S2-encapsulated
		if (
			response.action === "sendCC"
			&& receivedCC instanceof CommandClass
			&& receivedCC.isEncapsulatedWith(CommandClasses["Security 2"])
			&& !(response.cc instanceof Security2CCMessageEncapsulation)
		) {
			// Encapsulate the response
			const encapsulated = Security2CC.encapsulate(
				response.cc,
				self.id,
				self.securityManagers,
			);
			response.cc = encapsulated;
		}

		return response;
	},
};

export const Security2CCHooks = [encapsulateS2CC];

export const Security2CCBehaviors = [
	// Key exchange
	respondToS2KEXGet,
	respondToS2KEXSet,
	handleS2PublicKeyReport,
	respondToS2KEXReport,
	handleS2NetworkKeyReport,
	handleS2TransferEnd,
	// Normal operation
	respondToS2NonceGet,
	handleS2DecodeError,
	respondToS2CommandsSupportedGet,
];
