import {
	CommandClasses,
	MPANState,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type MulticastDestination,
	type S2SecurityClass,
	SECURITY_S2_AUTH_TAG_LENGTH,
	SPANState,
	type SPANTableEntry,
	SecurityClass,
	type SecurityManager2,
	TransmitOptions,
	ZWaveError,
	ZWaveErrorCodes,
	decryptAES128CCM,
	encodeBitMask,
	encryptAES128CCM,
	getCCName,
	highResTimestamp,
	isLongRangeNodeId,
	isTransmissionError,
	isZWaveError,
	parseBitMask,
	parseCCList,
	securityClassIsS2,
	securityClassOrder,
	validatePayload,
} from "@zwave-js/core";
import {
	EncapsulationFlags,
	type MaybeNotKnown,
	NODE_ID_BROADCAST,
	NODE_ID_BROADCAST_LR,
	encodeCCList,
} from "@zwave-js/core/safe";
import type {
	ZWaveApplicationHost,
	ZWaveHost,
	ZWaveValueHost,
} from "@zwave-js/host/safe";
import { buffer2hex, getEnumMemberName, pick } from "@zwave-js/shared/safe";
import { wait } from "alcalzone-shared/async";
import { isArray } from "alcalzone-shared/typeguards";
import { CCAPI } from "../lib/API";
import {
	type CCCommandOptions,
	CommandClass,
	type CommandClassDeserializationOptions,
	type CommandClassOptions,
	gotDeserializationOptions,
} from "../lib/CommandClass";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators";
import {
	MGRPExtension,
	MOSExtension,
	MPANExtension,
	SPANExtension,
	Security2Extension,
	ValidateS2ExtensionResult,
	validateS2Extension,
} from "../lib/Security2/Extension";
import { ECDHProfiles, KEXFailType, KEXSchemes } from "../lib/Security2/shared";
import { Security2Command } from "../lib/_Types";
import { CRC16CC } from "./CRC16CC";
import { MultiChannelCC } from "./MultiChannelCC";
import { SecurityCC } from "./SecurityCC";
import { TransportServiceCC } from "./TransportServiceCC";

function securityClassToBitMask(key: SecurityClass): Buffer {
	return encodeBitMask(
		[key],
		SecurityClass.S0_Legacy,
		SecurityClass.S2_Unauthenticated,
	);
}

function bitMaskToSecurityClass(buffer: Buffer, offset: number): SecurityClass {
	const keys = parseBitMask(
		buffer.subarray(offset, offset + 1),
		SecurityClass.S2_Unauthenticated,
	);
	validatePayload(keys.length === 1);
	return keys[0];
}

function getAuthenticationData(
	sendingNodeId: number,
	destination: number,
	homeId: number,
	commandLength: number,
	unencryptedPayload: Buffer,
): Buffer {
	const nodeIdSize =
		isLongRangeNodeId(sendingNodeId) || isLongRangeNodeId(destination)
			? 2
			: 1;
	const ret = Buffer.allocUnsafe(
		2 * nodeIdSize + 6 + unencryptedPayload.length,
	);
	let offset = 0;
	ret.writeUIntBE(sendingNodeId, offset, nodeIdSize);
	offset += nodeIdSize;
	ret.writeUIntBE(destination, offset, nodeIdSize);
	offset += nodeIdSize;
	ret.writeUInt32BE(homeId, offset);
	offset += 4;
	ret.writeUInt16BE(commandLength, offset);
	offset += 2;
	// This includes the sequence number and all unencrypted extensions
	unencryptedPayload.copy(ret, offset, 0);
	return ret;
}

function getSecurityManager(
	host: ZWaveHost,
	destination: MulticastDestination | number,
): SecurityManager2 | undefined {
	const longRange = isLongRangeNodeId(host.ownNodeId)
		|| isLongRangeNodeId(
			isArray(destination) ? destination[0] : destination,
		);
	return longRange
		? host.securityManagerLR
		: host.securityManager2;
}

/** Validates that a sequence number is not a duplicate and updates the SPAN table if it is accepted. Returns the previous sequence number if there is one. */
function validateSequenceNumber(
	this: Security2CC,
	sequenceNumber: number,
): number | undefined {
	const securityManager = getSecurityManager(this.host, this.nodeId);

	validatePayload.withReason(
		`Duplicate command (sequence number ${sequenceNumber})`,
	)(
		!securityManager!.isDuplicateSinglecast(
			this.nodeId as number,
			sequenceNumber,
		),
	);
	// Not a duplicate, store it
	return securityManager!.storeSequenceNumber(
		this.nodeId as number,
		sequenceNumber,
	);
}

function assertSecurity(this: Security2CC, options: CommandClassOptions): void {
	const verb = gotDeserializationOptions(options) ? "decoded" : "sent";
	if (!this.host.ownNodeId) {
		throw new ZWaveError(
			`Secure commands (S2) can only be ${verb} when the controller's node id is known!`,
			ZWaveErrorCodes.Driver_NotReady,
		);
	} else if (!getSecurityManager(this.host, this.nodeId)) {
		throw new ZWaveError(
			`Secure commands (S2) can only be ${verb} when the network keys are configured!`,
			ZWaveErrorCodes.Driver_NoSecurity,
		);
	}
}

const MAX_DECRYPT_ATTEMPTS_SINGLECAST = 5;
const MAX_DECRYPT_ATTEMPTS_MULTICAST = 5;
const MAX_DECRYPT_ATTEMPTS_SC_FOLLOWUP = 1;

// @publicAPI
export interface DecryptionResult {
	plaintext: Buffer;
	authOK: boolean;
	key?: Buffer;
	iv?: Buffer;
	securityClass: SecurityClass | undefined;
}

// Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
/* eslint-disable @zwave-js/ccapi-validate-args */

@API(CommandClasses["Security 2"])
export class Security2CCAPI extends CCAPI {
	public supportsCommand(_cmd: Security2Command): MaybeNotKnown<boolean> {
		// All commands are mandatory
		return true;
	}

	/**
	 * Sends a nonce to the node, either in response to a NonceGet request or a message that failed to decrypt. The message is sent without any retransmission etc.
	 * The return value indicates whether a nonce was successfully sent
	 */
	public async sendNonce(): Promise<boolean> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.NonceReport,
		);

		this.assertPhysicalEndpoint(this.endpoint);

		const securityManager = getSecurityManager(
			this.applHost,
			this.endpoint.nodeId,
		);

		if (!securityManager) {
			throw new ZWaveError(
				`Nonces can only be sent if secure communication is set up!`,
				ZWaveErrorCodes.Driver_NoSecurity,
			);
		}

		const receiverEI = securityManager.generateNonce(
			this.endpoint.nodeId,
		);

		const cc = new Security2CCNonceReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			SOS: true,
			MOS: false,
			receiverEI,
		});

		try {
			await this.applHost.sendCommand(cc, {
				...this.commandOptions,
				// Seems we need these options or some nodes won't accept the nonce
				transmitOptions: TransmitOptions.ACK
					| TransmitOptions.AutoRoute,
				// Only try sending a nonce once
				maxSendAttempts: 1,
				// Nonce requests must be handled immediately
				priority: MessagePriority.Immediate,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
				// And we need to react to
			});
		} catch (e) {
			if (isTransmissionError(e)) {
				// The nonce could not be sent, invalidate it
				securityManager.deleteNonce(
					this.endpoint.nodeId,
				);
				return false;
			} else {
				// Pass other errors through
				throw e;
			}
		}
		return true;
	}

	/** Notifies the target node that the MPAN state is out of sync */
	public async sendMOS(): Promise<boolean> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.NonceReport,
		);

		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new Security2CCNonceReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			SOS: false,
			MOS: true,
		});

		try {
			await this.applHost.sendCommand(cc, {
				...this.commandOptions,
				// Seems we need these options or some nodes won't accept the nonce
				transmitOptions: TransmitOptions.ACK
					| TransmitOptions.AutoRoute,
				// Only try sending a nonce once
				maxSendAttempts: 1,
				// Nonce requests must be handled immediately
				priority: MessagePriority.Immediate,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
			});
		} catch (e) {
			if (isTransmissionError(e)) {
				return false;
			} else {
				// Pass other errors through
				throw e;
			}
		}
		return true;
	}

	/** Sends the given MPAN to the node */
	public async sendMPAN(
		groupId: number,
		innerMPANState: Buffer,
	): Promise<boolean> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.MessageEncapsulation,
		);

		this.assertPhysicalEndpoint(this.endpoint);

		const cc = new Security2CCMessageEncapsulation(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			extensions: [
				new MPANExtension({
					groupId,
					innerMPANState,
				}),
			],
		});

		try {
			await this.applHost.sendCommand(cc, {
				...this.commandOptions,
				// Seems we need these options or some nodes won't accept the nonce
				transmitOptions: TransmitOptions.ACK
					| TransmitOptions.AutoRoute,
				// Only try sending a nonce once
				maxSendAttempts: 1,
				// Nonce requests must be handled immediately
				priority: MessagePriority.Immediate,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
			});
		} catch (e) {
			if (isTransmissionError(e)) {
				return false;
			} else {
				// Pass other errors through
				throw e;
			}
		}
		return true;
	}

	/**
	 * Queries the securely supported commands for the current security class
	 * @param securityClass Can be used to overwrite the security class to use. If this doesn't match the current one, new nonces will need to be exchanged.
	 */
	public async getSupportedCommands(
		securityClass:
			| SecurityClass.S2_AccessControl
			| SecurityClass.S2_Authenticated
			| SecurityClass.S2_Unauthenticated,
	): Promise<MaybeNotKnown<CommandClasses[]>> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.CommandsSupportedGet,
		);

		let cc: CommandClass = new Security2CCCommandsSupportedGet(
			this.applHost,
			{
				nodeId: this.endpoint.nodeId,
				endpoint: this.endpoint.index,
			},
		);
		// Security2CCCommandsSupportedGet is special because we cannot reply on the applHost to do the automatic
		// encapsulation because it would use a different security class. Therefore the entire possible stack
		// of encapsulation needs to be done here
		if (MultiChannelCC.requiresEncapsulation(cc)) {
			cc = MultiChannelCC.encapsulate(this.applHost, cc);
		}
		cc = Security2CC.encapsulate(this.applHost, cc, { securityClass });

		const response = await this.applHost.sendCommand<
			Security2CCCommandsSupportedReport
		>(
			cc,
			{
				...this.commandOptions,
				autoEncapsulate: false,
			},
		);
		return response?.supportedCCs;
	}

	public async reportSupportedCommands(
		supportedCCs: CommandClasses[],
	): Promise<void> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.CommandsSupportedReport,
		);

		const cc = new Security2CCCommandsSupportedReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			supportedCCs,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getKeyExchangeParameters() {
		this.assertSupportsCommand(Security2Command, Security2Command.KEXGet);

		const cc = new Security2CCKEXGet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});
		const response = await this.applHost.sendCommand<Security2CCKEXReport>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, [
				"requestCSA",
				"echo",
				"supportedKEXSchemes",
				"supportedECDHProfiles",
				"requestedKeys",
				"_reserved",
			]);
		}
	}

	/** Grants the joining node the given keys */
	public async grantKeys(
		params: Omit<Security2CCKEXSetOptions, "echo">,
	): Promise<void> {
		this.assertSupportsCommand(Security2Command, Security2Command.KEXSet);

		const cc = new Security2CCKEXSet(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...params,
			echo: false,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/** Confirms the keys that were granted to a node */
	public async confirmGrantedKeys(
		params: Omit<Security2CCKEXReportOptions, "echo">,
	): Promise<void> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.KEXReport,
		);

		const cc = new Security2CCKEXReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			...params,
			echo: true,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	/** Notifies the other node that the ongoing key exchange was aborted */
	public async abortKeyExchange(failType: KEXFailType): Promise<void> {
		this.assertSupportsCommand(Security2Command, Security2Command.KEXFail);

		const cc = new Security2CCKEXFail(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			failType,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async sendPublicKey(publicKey: Buffer): Promise<void> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.PublicKeyReport,
		);

		const cc = new Security2CCPublicKeyReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			includingNode: true,
			publicKey,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async sendNetworkKey(
		securityClass: SecurityClass,
		networkKey: Buffer,
	): Promise<void> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.NetworkKeyReport,
		);

		const cc = new Security2CCNetworkKeyReport(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			grantedKey: securityClass,
			networkKey,
		});
		await this.applHost.sendCommand(cc, this.commandOptions);
	}

	public async confirmKeyVerification(): Promise<void> {
		this.assertSupportsCommand(
			Security2Command,
			Security2Command.TransferEnd,
		);

		const cc = new Security2CCTransferEnd(this.applHost, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			keyVerified: true,
			keyRequestComplete: false,
		});
		await this.applHost.sendCommand(cc, {
			...this.commandOptions,
			// Don't wait for an ACK from the node
			transmitOptions: TransmitOptions.DEFAULT & ~TransmitOptions.ACK,
		});
	}
}

@commandClass(CommandClasses["Security 2"])
@implementedVersion(1)
export class Security2CC extends CommandClass {
	declare ccCommand: Security2Command;

	public async interview(applHost: ZWaveApplicationHost): Promise<void> {
		const node = this.getNode(applHost)!;
		const endpoint = this.getEndpoint(applHost)!;
		const api = CCAPI.create(
			CommandClasses["Security 2"],
			applHost,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});
		const securityManager = getSecurityManager(applHost, node.id);

		// Only on the highest security class the response includes the supported commands
		const secClass = node.getHighestSecurityClass();
		let hasReceivedSecureCommands = false;

		let possibleSecurityClasses: S2SecurityClass[];
		if (securityClassIsS2(secClass)) {
			// The highest security class is known to be S2, only query that one
			possibleSecurityClasses = [secClass];
		} else if (endpoint.index === 0) {
			// If the highest security class isn't known, query all possible security classes
			// but only on the root device
			possibleSecurityClasses = [
				SecurityClass.S2_Unauthenticated,
				SecurityClass.S2_Authenticated,
				SecurityClass.S2_AccessControl,
			];
		} else {
			// For endpoint interviews, the security class MUST be known
			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message:
					`Cannot query securely supported commands for endpoint because the node's security class isn't known...`,
				level: "error",
			});
			return;
		}

		for (const secClass of possibleSecurityClasses) {
			// We might not know all assigned security classes yet, so we work our way up from low to high and try to request the supported commands.
			// This way, each command is encrypted with the security class we're currently testing.

			// If the node does not respond, it wasn't assigned the security class.
			// If it responds with a non-empty list, we know this is the highest class it supports.
			// If the list is empty, the security class is still supported.

			// If we already know the class is not supported, skip it
			if (node.hasSecurityClass(secClass) === false) continue;

			// If no key is configured for this security class, skip it
			if (
				!securityManager?.hasKeysForSecurityClass(secClass)
			) {
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: `Cannot query securely supported commands (${
						getEnumMemberName(
							SecurityClass,
							secClass,
						)
					}) - network key is not configured...`,
					level: "warn",
				});
				continue;
			}

			applHost.controllerLog.logNode(node.id, {
				endpoint: endpoint.index,
				message: `Querying securely supported commands (${
					getEnumMemberName(
						SecurityClass,
						secClass,
					)
				})...`,
				direction: "outbound",
			});

			// Query the supported commands but avoid remembering the wrong security class in case of a failure
			let supportedCCs: CommandClasses[] | undefined;
			// Try up to 3 times on the root device. We REALLY don't want a spurious timeout or collision to cause us to discard a known good security class
			const MAX_ATTEMPTS = this.endpointIndex === 0 ? 3 : 1;
			for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
				try {
					supportedCCs = await api.getSupportedCommands(secClass);
				} catch (e) {
					if (
						isZWaveError(e)
						&& e.code === ZWaveErrorCodes.Security2CC_CannotDecode
					) {
						// Either we were using a non-granted security class,
						// or querying with the known highest security class had an issue
						supportedCCs = undefined;
					} else {
						throw e;
					}
				}

				if (
					supportedCCs == undefined
					&& possibleSecurityClasses.length === 1
				) {
					if (attempts < MAX_ATTEMPTS) {
						// We definitely know the highest security class
						applHost.controllerLog.logNode(node.id, {
							endpoint: endpoint.index,
							message: `Querying securely supported commands (${
								getEnumMemberName(
									SecurityClass,
									secClass,
								)
							}), attempt ${attempts}/${MAX_ATTEMPTS} failed. Retrying in 500ms...`,
							level: "warn",
						});
						await wait(500);
						continue;
					} else if (endpoint.index > 0) {
						applHost.controllerLog.logNode(node.id, {
							endpoint: endpoint.index,
							message: `Querying securely supported commands (${
								getEnumMemberName(
									SecurityClass,
									secClass,
								)
							}) failed. Assuming the endpoint supports all its mandatory CCs securely...`,
							level: "warn",
						});

						// Just mark all endpoint CCs as secure. Without this we would attempt
						// unencrypted communication with the endpoint, which will likely fail.
						for (const [ccId] of endpoint.getCCs()) {
							endpoint.addCC(ccId, { secure: true });
						}

						break;
					} else {
						applHost.controllerLog.logNode(node.id, {
							endpoint: endpoint.index,
							message: `Querying securely supported commands (${
								getEnumMemberName(
									SecurityClass,
									secClass,
								)
							}) failed. Let's hope for the best...`,
							level: "warn",
						});
						break;
					}
				} else {
					// In any other case, we can stop trying
					break;
				}
			}

			if (supportedCCs == undefined) {
				if (
					endpoint.index === 0
					&& possibleSecurityClasses.length > 1
				) {
					// No supported commands found, mark the security class as not granted
					// unless we were sure about the security class
					node.setSecurityClass(secClass, false);

					applHost.controllerLog.logNode(node.id, {
						message: `The node was NOT granted the security class ${
							getEnumMemberName(
								SecurityClass,
								secClass,
							)
						}`,
						direction: "inbound",
					});
				}
				continue;
			}

			if (endpoint.index === 0 && possibleSecurityClasses.length > 1) {
				// Mark the security class as granted unless we were sure about the security class
				node.setSecurityClass(secClass, true);

				applHost.controllerLog.logNode(node.id, {
					message: `The node was granted the security class ${
						getEnumMemberName(
							SecurityClass,
							secClass,
						)
					}`,
					direction: "inbound",
				});
			}

			if (!hasReceivedSecureCommands && supportedCCs.length > 0) {
				hasReceivedSecureCommands = true;

				const logLines: string[] = [
					`received secure commands (${
						getEnumMemberName(
							SecurityClass,
							secClass,
						)
					})`,
					"supported CCs:",
				];
				for (const cc of supportedCCs) {
					logLines.push(`· ${getCCName(cc)}`);
				}
				applHost.controllerLog.logNode(node.id, {
					endpoint: endpoint.index,
					message: logLines.join("\n"),
					direction: "inbound",
				});

				// Remember which commands are supported securely
				for (const cc of supportedCCs) {
					// Basic CC has special rules for when it is considered supported
					// Therefore we mark all other CCs as supported, but not Basic CC,
					// for which support is determined later.
					if (cc === CommandClasses.Basic) {
						endpoint.addCC(cc, { secure: true });
					} else {
						endpoint.addCC(cc, {
							isSupported: true,
							secure: true,
						});
					}
				}
			}
		}

		// Remember that the interview is complete
		this.setInterviewComplete(applHost, true);
	}

	/** Tests if a command should be sent secure and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		// No security flag -> no encapsulation
		if (!(cc.encapsulationFlags & EncapsulationFlags.Security)) {
			return false;
		}
		// S0, CRC16, Transport Service -> no S2 encapsulation
		if (
			cc instanceof SecurityCC
			|| cc instanceof CRC16CC
			|| cc instanceof TransportServiceCC
		) {
			return false;
		}
		// S2: check command
		if (cc instanceof Security2CC) {
			// These S2 commands need additional encapsulation
			switch (cc.ccCommand) {
				case Security2Command.CommandsSupportedGet:
				case Security2Command.CommandsSupportedReport:
				case Security2Command.NetworkKeyGet:
				case Security2Command.NetworkKeyReport:
				case Security2Command.NetworkKeyVerify:
				case Security2Command.TransferEnd:
					return true;

				case Security2Command.KEXSet:
				case Security2Command.KEXReport:
					// KEXSet/Report need to be encrypted for the confirmation only
					return (cc as Security2CCKEXSet | Security2CCKEXReport)
						.echo;

				case Security2Command.KEXFail: {
					switch ((cc as Security2CCKEXFail).failType) {
						case KEXFailType.Decrypt:
						case KEXFailType.WrongSecurityLevel:
						case KEXFailType.KeyNotGranted:
						case KEXFailType.NoVerify:
							return true;
						default:
							return false;
					}
				}
			}
			return false;
		}

		// Everything else needs to be encapsulated if the CC is secure
		return true;
	}

	/** Encapsulates a command that should be sent encrypted */
	public static encapsulate(
		host: ZWaveHost,
		cc: CommandClass,
		options?: {
			securityClass?: S2SecurityClass;
			multicastOutOfSync?: boolean;
			multicastGroupId?: number;
			verifyDelivery?: boolean;
		},
	): Security2CCMessageEncapsulation {
		// Determine which extensions must be used on the command
		const extensions: Security2Extension[] = [];
		if (options?.multicastOutOfSync) {
			extensions.push(new MOSExtension());
		}
		if (options?.multicastGroupId != undefined) {
			extensions.push(
				new MGRPExtension({ groupId: options.multicastGroupId }),
			);
		}

		// Make sure that S2 multicast uses broadcasts. While the specs mention that both multicast and broadcast
		// are possible, it has been found that devices treat multicasts like singlecast followups and respond incorrectly.
		let nodeId: number;
		if (cc.isMulticast()) {
			if (cc.nodeId.some((nodeId) => isLongRangeNodeId(nodeId))) {
				nodeId = NODE_ID_BROADCAST_LR;
			} else {
				nodeId = NODE_ID_BROADCAST;
			}
		} else {
			nodeId = cc.nodeId as number;
		}

		const ret = new Security2CCMessageEncapsulation(host, {
			nodeId,
			encapsulated: cc,
			securityClass: options?.securityClass,
			extensions,
			verifyDelivery: options?.verifyDelivery,
		});

		// Copy the encapsulation flags from the encapsulated command
		// but omit Security, since we're doing that right now
		ret.encapsulationFlags = cc.encapsulationFlags
			& ~EncapsulationFlags.Security;

		return ret;
	}
}

// @publicAPI
export interface Security2CCMessageEncapsulationOptions
	extends CCCommandOptions
{
	/** Can be used to override the default security class for the command */
	securityClass?: S2SecurityClass;
	extensions?: Security2Extension[];
	encapsulated?: CommandClass;
	verifyDelivery?: boolean;
}

// An S2 encapsulated command may result in a NonceReport to be sent by the node if it couldn't decrypt the message
function getCCResponseForMessageEncapsulation(
	sent: Security2CCMessageEncapsulation,
) {
	if (sent.encapsulated?.expectsCCResponse()) {
		return [
			Security2CCMessageEncapsulation as any,
			Security2CCNonceReport as any,
		];
	}
}

function testCCResponseForMessageEncapsulation(
	sent: Security2CCMessageEncapsulation,
	received: Security2CCMessageEncapsulation | Security2CCNonceReport,
) {
	if (received instanceof Security2CCMessageEncapsulation) {
		return "checkEncapsulated";
	} else {
		return received.SOS && !!received.receiverEI;
	}
}

function failNoSPAN(): never {
	throw validatePayload.fail(ZWaveErrorCodes.Security2CC_NoSPAN);
}

function failNoMPAN(): never {
	throw validatePayload.fail(ZWaveErrorCodes.Security2CC_NoMPAN);
}

// @publicAPI
export type MulticastContext =
	| {
		isMulticast: true;
		groupId: number;
	}
	| {
		isMulticast: false;
		groupId?: number;
	};

@CCCommand(Security2Command.MessageEncapsulation)
@expectedCCResponse(
	getCCResponseForMessageEncapsulation,
	testCCResponseForMessageEncapsulation,
)
export class Security2CCMessageEncapsulation extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCMessageEncapsulationOptions,
	) {
		super(host, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);
		this.securityManager = getSecurityManager(host, this.nodeId)!;

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			// Check the sequence number to avoid duplicates
			this._sequenceNumber = this.payload[0];
			const sendingNodeId = this.nodeId as number;

			// Ensure the node has a security class
			const securityClass = this.host.getHighestSecurityClass(
				sendingNodeId,
			);
			validatePayload.withReason("No security class granted")(
				securityClass !== SecurityClass.None,
			);

			const hasExtensions = !!(this.payload[1] & 0b1);
			const hasEncryptedExtensions = !!(this.payload[1] & 0b10);

			let offset = 2;
			this.extensions = [];
			let mustDiscardCommand = false;

			const parseExtensions = (buffer: Buffer, wasEncrypted: boolean) => {
				while (true) {
					if (buffer.length < offset + 2) {
						// An S2 extension was expected, but the buffer is too short
						mustDiscardCommand = true;
						return;
					}

					// The length field could be too large, which would cause part of the actual ciphertext
					// to be ignored. Try to avoid this for known extensions by checking the actual and expected length.
					const { actual: actualLength, expected: expectedLength } =
						Security2Extension
							.getExtensionLength(
								buffer.subarray(offset),
							);

					// Parse the extension using the expected length if possible
					const extensionLength = expectedLength ?? actualLength;
					if (extensionLength < 2) {
						// An S2 extension was expected, but the length is too short
						mustDiscardCommand = true;
						return;
					} else if (
						extensionLength
							> buffer.length
								- offset
								- (wasEncrypted
									? 0
									: SECURITY_S2_AUTH_TAG_LENGTH)
					) {
						// The supposed length is longer than the space the extensions may occupy
						mustDiscardCommand = true;
						return;
					}

					const extensionData = buffer.subarray(
						offset,
						offset + extensionLength,
					);
					offset += extensionLength;

					const ext = Security2Extension.from(extensionData);

					switch (validateS2Extension(ext, wasEncrypted)) {
						case ValidateS2ExtensionResult.OK:
							if (
								expectedLength != undefined
								&& actualLength !== expectedLength
							) {
								// The extension length field does not match, ignore the extension
							} else {
								this.extensions.push(ext);
							}
							break;
						case ValidateS2ExtensionResult.DiscardExtension:
							// Do nothing
							break;
						case ValidateS2ExtensionResult.DiscardCommand:
							mustDiscardCommand = true;
							break;
					}

					// Check if that was the last extension
					if (!ext.moreToFollow) break;
				}
			};
			if (hasExtensions) parseExtensions(this.payload, false);

			const ctx = ((): MulticastContext => {
				const multicastGroupId = this.getMulticastGroupId();
				if (
					options.frameType === "multicast"
					|| options.frameType === "broadcast"
				) {
					if (multicastGroupId == undefined) {
						throw validatePayload.fail(
							"Multicast frames without MGRP extension",
						);
					}
					return {
						isMulticast: true,
						groupId: multicastGroupId,
					};
				} else {
					return { isMulticast: false, groupId: multicastGroupId };
				}
			})();

			// If a command is to be discarded before decryption,
			// we still need to increment the SPAN or MPAN state
			if (mustDiscardCommand) {
				if (ctx.isMulticast) {
					this.securityManager.nextPeerMPAN(
						sendingNodeId,
						ctx.groupId,
					);
				} else {
					this.securityManager.nextNonce(sendingNodeId);
				}
				throw validatePayload.fail(
					"Invalid S2 extension",
				);
			}

			let prevSequenceNumber: number | undefined;
			let mpanState:
				| ReturnType<SecurityManager2["getPeerMPAN"]>
				| undefined;
			if (ctx.isMulticast) {
				mpanState = this.securityManager.getPeerMPAN(
					sendingNodeId,
					ctx.groupId,
				);
			} else {
				// Don't accept duplicate Singlecast commands
				prevSequenceNumber = validateSequenceNumber.call(
					this,
					this._sequenceNumber,
				);

				// When a node receives a singlecast message after a multicast group was marked out of sync,
				// it must forget about the group.
				if (ctx.groupId == undefined) {
					this.securityManager.resetOutOfSyncMPANs(
						sendingNodeId,
					);
				}
			}

			const unencryptedPayload = this.payload.subarray(0, offset);
			const ciphertext = this.payload.subarray(
				offset,
				-SECURITY_S2_AUTH_TAG_LENGTH,
			);
			const authTag = this.payload.subarray(-SECURITY_S2_AUTH_TAG_LENGTH);
			this.authTag = authTag;

			const messageLength = super.computeEncapsulationOverhead()
				+ this.payload.length;

			const authData = getAuthenticationData(
				sendingNodeId,
				this.getDestinationIDRX(),
				this.host.homeId,
				messageLength,
				unencryptedPayload,
			);

			let decrypt: () => DecryptionResult;
			if (ctx.isMulticast) {
				// For incoming multicast commands, make sure we have an MPAN
				if (mpanState?.type !== MPANState.MPAN) {
					// If we don't, mark the MPAN as out of sync, so we can respond accordingly on the singlecast followup
					this.securityManager.storePeerMPAN(
						sendingNodeId,
						ctx.groupId,
						{ type: MPANState.OutOfSync },
					);
					throw failNoMPAN();
				}

				decrypt = () =>
					this.decryptMulticast(
						sendingNodeId,
						ctx.groupId,
						ciphertext,
						authData,
						authTag,
					);
			} else {
				// Decrypt payload and verify integrity
				const spanState = this.securityManager.getSPANState(
					sendingNodeId,
				);

				// If we are not able to establish an SPAN yet, fail the decryption
				if (spanState.type === SPANState.None) {
					throw failNoSPAN();
				} else if (spanState.type === SPANState.RemoteEI) {
					// TODO: The specs are not clear how to handle this case
					// For now, do the same as if we didn't have any EI
					throw failNoSPAN();
				}

				decrypt = () =>
					this.decryptSinglecast(
						sendingNodeId,
						prevSequenceNumber!,
						ciphertext,
						authData,
						authTag,
						spanState,
					);
			}

			let plaintext: Buffer | undefined;
			let authOK = false;
			let key: Buffer | undefined;
			let iv: Buffer | undefined;
			let decryptionSecurityClass: SecurityClass | undefined;

			// If the Receiver is unable to authenticate the singlecast message with the current SPAN,
			// the Receiver SHOULD try decrypting the message with one or more of the following SPAN values,
			// stopping when decryption is successful or the maximum number of iterations is reached.

			// If the Receiver is unable to decrypt the S2 MC frame with the current MPAN, the Receiver MAY try
			// decrypting the frame with one or more of the subsequent MPAN values, stopping when decryption is
			// successful or the maximum number of iterations is reached.
			const decryptAttempts = ctx.isMulticast
				? MAX_DECRYPT_ATTEMPTS_MULTICAST
				: ctx.groupId != undefined
				? MAX_DECRYPT_ATTEMPTS_SC_FOLLOWUP
				: MAX_DECRYPT_ATTEMPTS_SINGLECAST;

			for (let i = 0; i < decryptAttempts; i++) {
				({
					plaintext,
					authOK,
					key,
					iv,
					securityClass: decryptionSecurityClass,
				} = decrypt());
				if (!!authOK && !!plaintext) break;
				// No need to try further SPANs if we just got the sender's EI
				if (!!this.getSenderEI()) break;
			}

			// If authentication fails, do so with an error code that instructs the
			// applHost to tell the node we have no nonce
			if (!authOK || !plaintext) {
				if (ctx.isMulticast) {
					// Mark the MPAN as out of sync
					this.securityManager.storePeerMPAN(
						sendingNodeId,
						ctx.groupId,
						{ type: MPANState.OutOfSync },
					);
					throw validatePayload.fail(
						ZWaveErrorCodes.Security2CC_CannotDecodeMulticast,
					);
				} else {
					throw validatePayload.fail(
						ZWaveErrorCodes.Security2CC_CannotDecode,
					);
				}
			} else if (!ctx.isMulticast && ctx.groupId != undefined) {
				// After reception of a singlecast followup, the MPAN state must be increased
				this.securityManager.tryIncrementPeerMPAN(
					sendingNodeId,
					ctx.groupId,
				);
			}

			// Remember which security class was used to decrypt this message, so we can discard it later
			this.securityClass = decryptionSecurityClass;

			offset = 0;
			if (hasEncryptedExtensions) parseExtensions(plaintext, true);

			// Before we can continue, check if the command must be discarded
			if (mustDiscardCommand) {
				throw validatePayload.fail("Invalid extension");
			}

			// If the MPAN extension was received, store the MPAN
			if (!ctx.isMulticast) {
				const mpanExtension = this.getMPANExtension();
				if (mpanExtension) {
					this.securityManager.storePeerMPAN(
						sendingNodeId,
						mpanExtension.groupId,
						{
							type: MPANState.MPAN,
							currentMPAN: mpanExtension.innerMPANState,
						},
					);
				}
			}

			// Not every S2 message includes an encapsulated CC
			const decryptedCCBytes = plaintext.subarray(offset);
			if (decryptedCCBytes.length > 0) {
				// make sure this contains a complete CC command that's worth splitting
				validatePayload(decryptedCCBytes.length >= 2);
				// and deserialize the CC
				this.encapsulated = CommandClass.from(this.host, {
					data: decryptedCCBytes,
					fromEncapsulation: true,
					encapCC: this,
					frameType: options.frameType,
				});
			}
			this.plaintext = decryptedCCBytes;
			this.key = key;
			this.iv = iv;
		} else {
			if (!options.encapsulated && !options.extensions?.length) {
				throw new ZWaveError(
					"Security S2 encapsulation requires an encapsulated CC and/or extensions",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.securityClass = options.securityClass;
			if (options.encapsulated) {
				this.encapsulated = options.encapsulated;
				options.encapsulated.encapsulatingCC = this as any;
			}

			this.verifyDelivery = options.verifyDelivery !== false;

			this.extensions = options.extensions ?? [];
			if (
				typeof this.nodeId !== "number"
				&& !this.extensions.some((e) => e instanceof MGRPExtension)
			) {
				throw new ZWaveError(
					"Multicast Security S2 encapsulation requires the MGRP extension",
					ZWaveErrorCodes.Security2CC_MissingExtension,
				);
			}
		}
	}

	private securityManager: SecurityManager2;
	public readonly securityClass?: SecurityClass;

	// Only used for testing/debugging purposes
	private key?: Buffer;
	private iv?: Buffer;
	private authData?: Buffer;
	private authTag?: Buffer;
	private ciphertext?: Buffer;
	private plaintext?: Buffer;

	public readonly verifyDelivery: boolean = true;

	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			if (this.isSinglecast()) {
				this._sequenceNumber = this.securityManager
					.nextSequenceNumber(this.nodeId);
			} else {
				const groupId = this.getDestinationIDTX();
				return this.securityManager.nextMulticastSequenceNumber(
					groupId,
				);
			}
		}
		return this._sequenceNumber;
	}

	public encapsulated?: CommandClass;
	public extensions: Security2Extension[];

	public override prepareRetransmission(): void {
		super.prepareRetransmission();
		this._sequenceNumber = undefined;
	}

	private getDestinationIDTX(): number {
		if (this.isSinglecast()) return this.nodeId;

		const ret = this.getMulticastGroupId();
		if (ret == undefined) {
			throw new ZWaveError(
				"Multicast Security S2 encapsulation requires the MGRP extension",
				ZWaveErrorCodes.Security2CC_MissingExtension,
			);
		}
		return ret;
	}

	private getDestinationIDRX(): number {
		if (this.isSinglecast()) return this.host.ownNodeId;

		const ret = this.getMulticastGroupId();
		if (ret == undefined) {
			throw new ZWaveError(
				"Multicast Security S2 encapsulation requires the MGRP extension",
				ZWaveErrorCodes.Security2CC_MissingExtension,
			);
		}
		return ret;
	}

	private getMGRPExtension(): MGRPExtension | undefined {
		return this.extensions.find(
			(e) => e instanceof MGRPExtension,
		);
	}

	public getMulticastGroupId(): number | undefined {
		const mgrpExtension = this.getMGRPExtension();
		return mgrpExtension?.groupId;
	}

	private getMPANExtension(): MPANExtension | undefined {
		return this.extensions.find(
			(e) => e instanceof MPANExtension,
		);
	}

	public hasMOSExtension(): boolean {
		return this.extensions.some((e) => e instanceof MOSExtension);
	}

	/** Returns the Sender's Entropy Input if this command contains an SPAN extension */
	public getSenderEI(): Buffer | undefined {
		const spanExtension = this.extensions.find(
			(e) => e instanceof SPANExtension,
		);
		return spanExtension?.senderEI;
	}

	private maybeAddSPANExtension(): void {
		if (!this.isSinglecast()) return;

		const receiverNodeId: number = this.nodeId;
		const spanState = this.securityManager.getSPANState(
			receiverNodeId,
		);
		if (
			spanState.type === SPANState.None
			|| spanState.type === SPANState.LocalEI
		) {
			// Can't do anything here if we don't have the receiver's EI
			throw new ZWaveError(
				`Security S2 CC requires the receiver's nonce to be sent!`,
				ZWaveErrorCodes.Security2CC_NoSPAN,
			);
		} else if (spanState.type === SPANState.RemoteEI) {
			// We have the receiver's EI, generate our input and send it over
			// With both, we can create an SPAN
			const senderEI = this.securityManager.generateNonce(
				undefined,
			);
			const receiverEI = spanState.receiverEI;

			// While bootstrapping a node, the controller only sends commands encrypted
			// with the temporary key
			if (this.securityManager.tempKeys.has(receiverNodeId)) {
				this.securityManager.initializeTempSPAN(
					receiverNodeId,
					senderEI,
					receiverEI,
				);
			} else {
				const securityClass = this.securityClass
					?? this.host.getHighestSecurityClass(receiverNodeId);

				if (securityClass == undefined) {
					throw new ZWaveError(
						"No security class defined for this command!",
						ZWaveErrorCodes.Security2CC_NoSPAN,
					);
				}
				this.securityManager.initializeSPAN(
					receiverNodeId,
					securityClass,
					senderEI,
					receiverEI,
				);
			}

			// Add or update the SPAN extension
			let spanExtension = this.extensions.find(
				(e) => e instanceof SPANExtension,
			);
			if (spanExtension) {
				spanExtension.senderEI = senderEI;
			} else {
				spanExtension = new SPANExtension({ senderEI });
				this.extensions.push(spanExtension);
			}
		}
	}

	public serialize(): Buffer {
		// Include Sender EI in the command if we only have the receiver's EI
		this.maybeAddSPANExtension();

		const unencryptedExtensions = this.extensions.filter(
			(e) => !e.isEncrypted(),
		);
		const encryptedExtensions = this.extensions.filter((e) =>
			e.isEncrypted()
		);

		const unencryptedPayload = Buffer.concat([
			Buffer.from([
				this.sequenceNumber,
				(encryptedExtensions.length > 0 ? 0b10 : 0)
				| (unencryptedExtensions.length > 0 ? 1 : 0),
			]),
			...unencryptedExtensions.map((e, index) =>
				e.serialize(index < unencryptedExtensions.length - 1)
			),
		]);
		const serializedCC = this.encapsulated?.serialize() ?? Buffer.from([]);
		const plaintextPayload = Buffer.concat([
			...encryptedExtensions.map((e, index) =>
				e.serialize(index < encryptedExtensions.length - 1)
			),
			serializedCC,
		]);

		// Generate the authentication data for CCM encryption
		const destinationTag = this.getDestinationIDTX();
		const messageLength = this.computeEncapsulationOverhead()
			+ serializedCC.length;
		const authData = getAuthenticationData(
			this.host.ownNodeId,
			destinationTag,
			this.host.homeId,
			messageLength,
			unencryptedPayload,
		);

		let key: Buffer;
		let iv: Buffer;

		if (this.isSinglecast()) {
			// Singlecast:
			// Generate a nonce for encryption, and remember it to attempt decryption
			// of potential in-flight messages from the target node.
			iv = this.securityManager.nextNonce(this.nodeId, true);
			const { keyCCM } =
				// Prefer the overridden security class if it was given
				this.securityClass != undefined
					? this.securityManager.getKeysForSecurityClass(
						this.securityClass,
					)
					: this.securityManager.getKeysForNode(this.nodeId);
			key = keyCCM;
		} else {
			// Multicast:
			const keyAndIV = this.securityManager.getMulticastKeyAndIV(
				destinationTag,
			);
			key = keyAndIV.key;
			iv = keyAndIV.iv;
		}

		const { ciphertext: ciphertextPayload, authTag } = encryptAES128CCM(
			key,
			iv,
			plaintextPayload,
			authData,
			SECURITY_S2_AUTH_TAG_LENGTH,
		);

		// Remember key and IV for debugging purposes
		this.key = key;
		this.iv = iv;
		this.authData = authData;
		this.authTag = authTag;
		this.ciphertext = ciphertextPayload;

		this.payload = Buffer.concat([
			unencryptedPayload,
			ciphertextPayload,
			authTag,
		]);
		return super.serialize();
	}

	protected computeEncapsulationOverhead(): number {
		// Security S2 adds:
		// * 1 byte sequence number
		// * 1 byte control
		// * N bytes extensions
		// * SECURITY_S2_AUTH_TAG_LENGTH bytes auth tag
		const extensionBytes = this.extensions
			.map((e) => e.computeLength())
			.reduce((a, b) => a + b, 0);

		return (
			super.computeEncapsulationOverhead()
			+ 2
			+ SECURITY_S2_AUTH_TAG_LENGTH
			+ extensionBytes
		);
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sequence number": this.sequenceNumber,
		};
		if (this.extensions.length > 0) {
			message.extensions = this.extensions
				.map((e) => e.toLogEntry())
				.join("");
		}
		// Log the used keys in integration tests
		if (
			process.env.NODE_ENV === "test"
			|| process.env.NODE_ENV === "development"
		) {
			if (this.key) {
				message.key = buffer2hex(this.key);
			}
			if (this.iv) {
				message.IV = buffer2hex(this.iv);
			}
			if (this.ciphertext) {
				message.ciphertext = buffer2hex(this.ciphertext);
			} else if (this.plaintext) {
				message.plaintext = buffer2hex(this.plaintext);
			}
			if (this.authData) {
				message["auth data"] = buffer2hex(this.authData);
			}
			if (this.authTag) {
				message["auth tag"] = buffer2hex(this.authTag);
			}
		}

		if (this.isSinglecast()) {
			// TODO: This is ugly, we should probably do this in the constructor or so
			let securityClass = this.securityClass;
			if (securityClass == undefined) {
				const spanState = this.securityManager.getSPANState(
					this.nodeId,
				);
				if (spanState.type === SPANState.SPAN) {
					securityClass = spanState.securityClass;
				}
			}

			if (securityClass != undefined) {
				message["security class"] = getEnumMemberName(
					SecurityClass,
					securityClass,
				);
			}
		}

		return {
			...super.toLogEntry(host),
			message,
		};
	}

	private decryptSinglecast(
		sendingNodeId: number,
		prevSequenceNumber: number,
		ciphertext: Buffer,
		authData: Buffer,
		authTag: Buffer,
		spanState: SPANTableEntry & {
			type: SPANState.SPAN | SPANState.LocalEI;
		},
	): DecryptionResult {
		const decryptWithNonce = (nonce: Buffer) => {
			const { keyCCM: key } = this.securityManager.getKeysForNode(
				sendingNodeId,
			);

			const iv = nonce;
			return {
				key,
				iv,
				...decryptAES128CCM(key, iv, ciphertext, authData, authTag),
			};
		};
		const getNonceAndDecrypt = () => {
			const iv = this.securityManager.nextNonce(sendingNodeId);
			return decryptWithNonce(iv);
		};

		if (spanState.type === SPANState.SPAN) {
			// There SHOULD be a shared SPAN between both parties. But experience has shown that both could have
			// sent a command at roughly the same time, using the same SPAN for encryption.
			// To avoid a nasty desync and both nodes trying to resync at the same time, causing message loss,
			// we accept commands encrypted with the previous SPAN under very specific circumstances:
			if (
				// The previous SPAN is still known, i.e. the node didn't send another command that was successfully decrypted
				!!spanState.currentSPAN
				// it is still valid
				&& spanState.currentSPAN.expires > highResTimestamp()
				// The received command is exactly the next, expected one
				&& prevSequenceNumber != undefined
				&& this["_sequenceNumber"] === ((prevSequenceNumber + 1) & 0xff)
				// And in case of a mock-based test, do this only on the controller
				&& !this.host.__internalIsMockNode
			) {
				const nonce = spanState.currentSPAN.nonce;
				spanState.currentSPAN = undefined;

				// If we could decrypt this way, we're done...
				const result = decryptWithNonce(nonce);
				if (result.authOK) {
					return {
						...result,
						securityClass: spanState.securityClass,
					};
				}
				// ...otherwise, we need to try the normal way
			} else {
				// forgetting the current SPAN shouldn't be necessary but better be safe than sorry
				spanState.currentSPAN = undefined;
			}

			// This can only happen if the security class is known
			return {
				...getNonceAndDecrypt(),
				securityClass: spanState.securityClass,
			};
		} else if (spanState.type === SPANState.LocalEI) {
			// We've sent the other our receiver's EI and received its sender's EI,
			// meaning we can now establish an SPAN
			const senderEI = this.getSenderEI();
			if (!senderEI) throw failNoSPAN();
			const receiverEI = spanState.receiverEI;

			// How we do this depends on whether we know the security class of the other node
			const isBootstrappingNode = this.securityManager.tempKeys.has(
				sendingNodeId,
			);
			if (isBootstrappingNode) {
				// We're currently bootstrapping the node, it might be using a temporary key
				this.securityManager.initializeTempSPAN(
					sendingNodeId,
					senderEI,
					receiverEI,
				);

				const ret = getNonceAndDecrypt();
				// Decryption with the temporary key worked
				if (ret.authOK) {
					return {
						...ret,
						securityClass: SecurityClass.Temporary,
					};
				}

				// Reset the SPAN state and try with the recently granted security class
				this.securityManager.setSPANState(
					sendingNodeId,
					spanState,
				);
			}

			// When ending up here, one of two situations has occured:
			// a) We've taken over an existing network and do not know the node's security class
			// b) We know the security class, but we're about to establish a new SPAN. This may happen at a lower
			//    security class than the one the node normally uses, e.g. when we're being queried for securely
			//    supported CCs.
			// In both cases, we should simply try decoding with multiple security classes, starting from the highest one.
			// If this fails, we restore the previous (partial) SPAN state.

			// Try all security classes where we do not definitely know that it was not granted
			// While bootstrapping a node, we consider the key that is being exchanged (including S0) to be the highest. No need to look at others
			const possibleSecurityClasses = isBootstrappingNode
				? [this.host.getHighestSecurityClass(sendingNodeId)!]
				: securityClassOrder.filter(
					(s) =>
						this.host.hasSecurityClass(sendingNodeId, s)
							!== false,
				);

			for (const secClass of possibleSecurityClasses) {
				// Skip security classes we don't have keys for
				if (
					!this.securityManager.hasKeysForSecurityClass(
						secClass,
					)
				) {
					continue;
				}

				// Initialize an SPAN with that security class
				this.securityManager.initializeSPAN(
					sendingNodeId,
					secClass,
					senderEI,
					receiverEI,
				);
				const ret = getNonceAndDecrypt();

				// It worked, return the result
				if (ret.authOK) {
					// Also if we weren't sure before, we now know that the security class is granted
					if (
						this.host.hasSecurityClass(sendingNodeId, secClass)
							=== undefined
					) {
						this.host.setSecurityClass(
							sendingNodeId,
							secClass,
							true,
						);
					}
					return {
						...ret,
						securityClass: secClass,
					};
				} else {
					// Reset the SPAN state and try with the next security class
					this.securityManager.setSPANState(
						sendingNodeId,
						spanState,
					);
				}
			}
		}

		// Nothing worked, fail the decryption
		return {
			plaintext: Buffer.from([]),
			authOK: false,
			securityClass: undefined,
		};
	}

	private decryptMulticast(
		sendingNodeId: number,
		groupId: number,
		ciphertext: Buffer,
		authData: Buffer,
		authTag: Buffer,
	): DecryptionResult {
		const iv = this.securityManager.nextPeerMPAN(
			sendingNodeId,
			groupId,
		);
		const { keyCCM: key } = this.securityManager.getKeysForNode(
			sendingNodeId,
		);
		return {
			key,
			iv,
			...decryptAES128CCM(key, iv, ciphertext, authData, authTag),
			// The security class is irrelevant when decrypting multicast commands
			securityClass: undefined,
		};
	}
}

// @publicAPI
export type Security2CCNonceReportOptions =
	| {
		MOS: boolean;
		SOS: true;
		receiverEI: Buffer;
	}
	| {
		MOS: true;
		SOS: false;
		receiverEI?: undefined;
	};

@CCCommand(Security2Command.NonceReport)
export class Security2CCNonceReport extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & Security2CCNonceReportOptions),
	) {
		super(host, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);
		this.securityManager = getSecurityManager(host, this.nodeId)!;

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			this._sequenceNumber = this.payload[0];
			// Don't accept duplicate commands
			validateSequenceNumber.call(this, this._sequenceNumber);

			this.MOS = !!(this.payload[1] & 0b10);
			this.SOS = !!(this.payload[1] & 0b1);
			validatePayload(this.MOS || this.SOS);

			if (this.SOS) {
				// If the SOS flag is set, the REI field MUST be included in the command
				validatePayload(this.payload.length >= 18);
				this.receiverEI = this.payload.subarray(2, 18);

				// In that case we also need to store it, so the next sent command
				// can use it for encryption
				this.securityManager.storeRemoteEI(
					this.nodeId as number,
					this.receiverEI,
				);
			}
		} else {
			this.SOS = options.SOS;
			this.MOS = options.MOS;
			if (options.SOS) this.receiverEI = options.receiverEI;
		}
	}

	private securityManager: SecurityManager2;
	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			this._sequenceNumber = this.securityManager
				.nextSequenceNumber(
					this.nodeId as number,
				);
		}
		return this._sequenceNumber;
	}

	public readonly SOS: boolean;
	public readonly MOS: boolean;
	public readonly receiverEI?: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			this.sequenceNumber,
			(this.MOS ? 0b10 : 0) + (this.SOS ? 0b1 : 0),
		]);
		if (this.SOS) {
			this.payload = Buffer.concat([this.payload, this.receiverEI!]);
		}
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"sequence number": this.sequenceNumber,
			SOS: this.SOS,
			MOS: this.MOS,
		};
		if (this.receiverEI) {
			message["receiver entropy"] = buffer2hex(this.receiverEI);
		}
		return {
			...super.toLogEntry(host),
			message,
		};
	}
}

@CCCommand(Security2Command.NonceGet)
@expectedCCResponse(Security2CCNonceReport)
export class Security2CCNonceGet extends Security2CC {
	// TODO: A node sending this command MUST accept a delay up to <Previous Round-trip-time to peer node> +
	// 250 ms before receiving the Security 2 Nonce Report Command.

	public constructor(host: ZWaveHost, options: CCCommandOptions) {
		super(host, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);
		this.securityManager = getSecurityManager(host, this.nodeId)!;

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this._sequenceNumber = this.payload[0];
			// Don't accept duplicate commands
			validateSequenceNumber.call(this, this._sequenceNumber);
		} else {
			// No options here
		}
	}

	private securityManager: SecurityManager2;
	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			this._sequenceNumber = this.securityManager
				.nextSequenceNumber(
					this.nodeId as number,
				);
		}
		return this._sequenceNumber;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sequenceNumber]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { "sequence number": this.sequenceNumber },
		};
	}
}

// @publicAPI
export interface Security2CCKEXReportOptions {
	requestCSA: boolean;
	echo: boolean;
	_reserved?: number;
	supportedKEXSchemes: KEXSchemes[];
	supportedECDHProfiles: ECDHProfiles[];
	requestedKeys: SecurityClass[];
}

@CCCommand(Security2Command.KEXReport)
export class Security2CCKEXReport extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & Security2CCKEXReportOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.requestCSA = !!(this.payload[0] & 0b10);
			this.echo = !!(this.payload[0] & 0b1);
			// Remember the reserved bits for the echo
			this._reserved = this.payload[0] & 0b1111_1100;
			// The bit mask starts at 0, but bit 0 is not used
			this.supportedKEXSchemes = parseBitMask(
				this.payload.subarray(1, 2),
				0,
			).filter((s) => s !== 0);
			this.supportedECDHProfiles = parseBitMask(
				this.payload.subarray(2, 3),
				ECDHProfiles.Curve25519,
			);
			this.requestedKeys = parseBitMask(
				this.payload.subarray(3, 4),
				SecurityClass.S2_Unauthenticated,
			);
		} else {
			this.requestCSA = options.requestCSA;
			this.echo = options.echo;
			this._reserved = options._reserved ?? 0;
			this.supportedKEXSchemes = options.supportedKEXSchemes;
			this.supportedECDHProfiles = options.supportedECDHProfiles;
			this.requestedKeys = options.requestedKeys;
		}
	}

	public readonly _reserved: number;
	public readonly requestCSA: boolean;
	public readonly echo: boolean;
	public readonly supportedKEXSchemes: readonly KEXSchemes[];
	public readonly supportedECDHProfiles: readonly ECDHProfiles[];
	public readonly requestedKeys: readonly SecurityClass[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([
				this._reserved
				+ (this.requestCSA ? 0b10 : 0)
				+ (this.echo ? 0b1 : 0),
			]),
			// The bit mask starts at 0, but bit 0 is not used
			encodeBitMask(this.supportedKEXSchemes, 7, 0),
			encodeBitMask(
				this.supportedECDHProfiles,
				7,
				ECDHProfiles.Curve25519,
			),
			encodeBitMask(
				this.requestedKeys,
				SecurityClass.S0_Legacy,
				SecurityClass.S2_Unauthenticated,
			),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				echo: this.echo,
				"supported schemes": this.supportedKEXSchemes
					.map((s) => `\n· ${getEnumMemberName(KEXSchemes, s)}`)
					.join(""),
				"supported ECDH profiles": this.supportedECDHProfiles
					.map((s) => `\n· ${getEnumMemberName(ECDHProfiles, s)}`)
					.join(""),
				"CSA requested": this.requestCSA,
				"requested security classes": this.requestedKeys
					.map((s) => `\n· ${getEnumMemberName(SecurityClass, s)}`)
					.join(""),
			},
		};
	}
}

@CCCommand(Security2Command.KEXGet)
@expectedCCResponse(Security2CCKEXReport)
export class Security2CCKEXGet extends Security2CC {}

// @publicAPI
export interface Security2CCKEXSetOptions {
	permitCSA: boolean;
	echo: boolean;
	selectedKEXScheme: KEXSchemes;
	selectedECDHProfile: ECDHProfiles;
	grantedKeys: SecurityClass[];
}

@CCCommand(Security2Command.KEXSet)
export class Security2CCKEXSet extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & Security2CCKEXSetOptions),
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 4);
			this.permitCSA = !!(this.payload[0] & 0b10);
			this.echo = !!(this.payload[0] & 0b1);
			// The bit mask starts at 0, but bit 0 is not used
			const selectedKEXSchemes = parseBitMask(
				this.payload.subarray(1, 2),
				0,
			).filter((s) => s !== 0);
			validatePayload(selectedKEXSchemes.length === 1);
			this.selectedKEXScheme = selectedKEXSchemes[0];

			const selectedECDHProfiles = parseBitMask(
				this.payload.subarray(2, 3),
				ECDHProfiles.Curve25519,
			);
			validatePayload(selectedECDHProfiles.length === 1);
			this.selectedECDHProfile = selectedECDHProfiles[0];

			this.grantedKeys = parseBitMask(
				this.payload.subarray(3, 4),
				SecurityClass.S2_Unauthenticated,
			);
		} else {
			this.permitCSA = options.permitCSA;
			this.echo = options.echo;
			this.selectedKEXScheme = options.selectedKEXScheme;
			this.selectedECDHProfile = options.selectedECDHProfile;
			this.grantedKeys = options.grantedKeys;
		}
	}

	public permitCSA: boolean;
	public echo: boolean;
	public selectedKEXScheme: KEXSchemes;
	public selectedECDHProfile: ECDHProfiles;
	public grantedKeys: SecurityClass[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([(this.permitCSA ? 0b10 : 0) + (this.echo ? 0b1 : 0)]),
			// The bit mask starts at 0, but bit 0 is not used
			encodeBitMask([this.selectedKEXScheme], 7, 0),
			encodeBitMask(
				[this.selectedECDHProfile],
				7,
				ECDHProfiles.Curve25519,
			),
			encodeBitMask(
				this.grantedKeys,
				SecurityClass.S0_Legacy,
				SecurityClass.S2_Unauthenticated,
			),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				echo: this.echo,
				"selected scheme": getEnumMemberName(
					KEXSchemes,
					this.selectedKEXScheme,
				),
				"selected ECDH profile": getEnumMemberName(
					ECDHProfiles,
					this.selectedECDHProfile,
				),
				"CSA permitted": this.permitCSA,
				"granted security classes": this.grantedKeys
					.map((s) => `\n· ${getEnumMemberName(SecurityClass, s)}`)
					.join(""),
			},
		};
	}
}

// @publicAPI
export interface Security2CCKEXFailOptions extends CCCommandOptions {
	failType: KEXFailType;
}

@CCCommand(Security2Command.KEXFail)
export class Security2CCKEXFail extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options: CommandClassDeserializationOptions | Security2CCKEXFailOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.failType = this.payload[0];
		} else {
			this.failType = options.failType;
		}
	}

	public failType: KEXFailType;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.failType]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: { reason: getEnumMemberName(KEXFailType, this.failType) },
		};
	}
}

// @publicAPI
export interface Security2CCPublicKeyReportOptions extends CCCommandOptions {
	includingNode: boolean;
	publicKey: Buffer;
}

@CCCommand(Security2Command.PublicKeyReport)
export class Security2CCPublicKeyReport extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCPublicKeyReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 17);
			this.includingNode = !!(this.payload[0] & 0b1);
			this.publicKey = this.payload.subarray(1);
		} else {
			this.includingNode = options.includingNode;
			this.publicKey = options.publicKey;
		}
	}

	public includingNode: boolean;
	public publicKey: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.includingNode ? 1 : 0]),
			this.publicKey,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"is including node": this.includingNode,
				"public key": buffer2hex(this.publicKey),
			},
		};
	}
}

// @publicAPI
export interface Security2CCNetworkKeyReportOptions extends CCCommandOptions {
	grantedKey: SecurityClass;
	networkKey: Buffer;
}

@CCCommand(Security2Command.NetworkKeyReport)
export class Security2CCNetworkKeyReport extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCNetworkKeyReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.grantedKey = options.grantedKey;
			this.networkKey = options.networkKey;
		}
	}

	public grantedKey: SecurityClass;
	public networkKey: Buffer;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			securityClassToBitMask(this.grantedKey),
			this.networkKey,
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"security class": getEnumMemberName(
					SecurityClass,
					this.grantedKey,
				),
				// This shouldn't be logged, so users can safely post their logs online
				// "network key": buffer2hex(this.networkKey),
			},
		};
	}
}

// @publicAPI
export interface Security2CCNetworkKeyGetOptions extends CCCommandOptions {
	requestedKey: SecurityClass;
}

@CCCommand(Security2Command.NetworkKeyGet)
@expectedCCResponse(Security2CCNetworkKeyReport)
export class Security2CCNetworkKeyGet extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCNetworkKeyGetOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.requestedKey = bitMaskToSecurityClass(this.payload, 0);
		} else {
			this.requestedKey = options.requestedKey;
		}
	}

	public requestedKey: SecurityClass;

	public serialize(): Buffer {
		this.payload = securityClassToBitMask(this.requestedKey);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"security class": getEnumMemberName(
					SecurityClass,
					this.requestedKey,
				),
			},
		};
	}
}

@CCCommand(Security2Command.NetworkKeyVerify)
export class Security2CCNetworkKeyVerify extends Security2CC {}

// @publicAPI
export interface Security2CCTransferEndOptions extends CCCommandOptions {
	keyVerified: boolean;
	keyRequestComplete: boolean;
}

@CCCommand(Security2Command.TransferEnd)
export class Security2CCTransferEnd extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCTransferEndOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this.keyVerified = !!(this.payload[0] & 0b10);
			this.keyRequestComplete = !!(this.payload[0] & 0b1);
		} else {
			this.keyVerified = options.keyVerified;
			this.keyRequestComplete = options.keyRequestComplete;
		}
	}

	public keyVerified: boolean;
	public keyRequestComplete: boolean;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			(this.keyVerified ? 0b10 : 0) + (this.keyRequestComplete ? 0b1 : 0),
		]);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"key verified": this.keyVerified,
				"request complete": this.keyRequestComplete,
			},
		};
	}
}

// @publicAPI
export interface Security2CCCommandsSupportedReportOptions
	extends CCCommandOptions
{
	supportedCCs: CommandClasses[];
}

@CCCommand(Security2Command.CommandsSupportedReport)
export class Security2CCCommandsSupportedReport extends Security2CC {
	public constructor(
		host: ZWaveHost,
		options:
			| CommandClassDeserializationOptions
			| Security2CCCommandsSupportedReportOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			const CCs = parseCCList(this.payload);
			// SDS13783: A sending node MAY terminate the list of supported command classes with the
			// COMMAND_CLASS_MARK command class identifier.
			// A receiving node MUST stop parsing the list of supported command classes if it detects the
			// COMMAND_CLASS_MARK command class identifier in the Security 2 Commands Supported Report
			this.supportedCCs = CCs.supportedCCs;
		} else {
			this.supportedCCs = options.supportedCCs;
		}
	}

	public readonly supportedCCs: CommandClasses[];

	public serialize(): Buffer {
		this.payload = encodeCCList(this.supportedCCs, []);
		return super.serialize();
	}

	public toLogEntry(host?: ZWaveValueHost): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(host),
			message: {
				"supported CCs": this.supportedCCs
					.map((cc) => getCCName(cc))
					.map((cc) => `\n· ${cc}`)
					.join(""),
			},
		};
	}
}

@CCCommand(Security2Command.CommandsSupportedGet)
@expectedCCResponse(Security2CCCommandsSupportedReport)
export class Security2CCCommandsSupportedGet extends Security2CC {}
