import {
	CommandClasses,
	decryptAES128CCM,
	encodeBitMask,
	encryptAES128CCM,
	isTransmissionError,
	Maybe,
	MessageOrCCLogEntry,
	MessageRecord,
	parseBitMask,
	parseCCList,
	SecurityClass,
	SECURITY_S2_AUTH_TAG_LENGTH,
	SPANState,
	validatePayload,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import { SendDataBridgeRequest } from "../controller/SendDataBridgeMessages";
import { SendDataRequest } from "../controller/SendDataMessages";
import { TransmitOptions } from "../controller/SendDataShared";
import type { Driver } from "../driver/Driver";
import { FunctionType, MessagePriority } from "../message/Constants";
import { CCAPI } from "./API";
import {
	API,
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
	CommandClassOptions,
	expectedCCResponse,
	gotDeserializationOptions,
	implementedVersion,
} from "./CommandClass";
import {
	MGRPExtension,
	Security2Extension,
	SPANExtension,
} from "./Security2/Extension";
import { ECDHProfiles, KEXFailType, KEXSchemes } from "./Security2/shared";

// All the supported commands
export enum Security2Command {
	NonceGet = 0x01,
	NonceReport = 0x02,
	MessageEncapsulation = 0x03,
	KEXGet = 0x04,
	KEXReport = 0x05,
	KEXSet = 0x06,
	KEXFail = 0x07,
	PublicKeyReport = 0x08,
	NetworkKeyGet = 0x09,
	NetworkKeyReport = 0x0a,
	NetworkKeyVerify = 0x0b,
	TransferEnd = 0x0c,
	CommandsSupportedGet = 0x0d,
	CommandsSupportedReport = 0x0e,
}

function securityClassToBitMask(key: SecurityClass): Buffer {
	return encodeBitMask(
		[key],
		SecurityClass.S0_Legacy,
		SecurityClass.S2_Unauthenticated,
	);
}

function bitMaskToSecurityClass(buffer: Buffer, offset: number): SecurityClass {
	const keys = parseBitMask(
		buffer.slice(offset, offset + 1),
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
	const ret = Buffer.allocUnsafe(8 + unencryptedPayload.length);
	ret[0] = sendingNodeId;
	ret[1] = destination;
	ret.writeUInt32BE(homeId, 2);
	ret.writeUInt16BE(commandLength, 6);
	// This includes the sequence number and all unencrypted extensions
	unencryptedPayload.copy(ret, 8, 0);
	return ret;
}

/** Validates that a sequence number is not a duplicate and updates the SPAN table if it is accepted */
function validateSequenceNumber(this: Security2CC, sequenceNumber: number) {
	const peerNodeID = this.nodeId as number;
	validatePayload.withReason("Duplicate command")(
		!this.driver.securityManager2!.isDuplicateSinglecast(
			peerNodeID,
			sequenceNumber,
		),
	);
	// Not a duplicate, store it
	this.driver.securityManager2!.storeSequenceNumber(
		peerNodeID,
		sequenceNumber,
	);
}

function assertSecurity(this: Security2CC, options: CommandClassOptions): void {
	const verb = gotDeserializationOptions(options) ? "decoded" : "sent";
	if (!this.driver.controller.ownNodeId) {
		throw new ZWaveError(
			`Secure commands (S2) can only be ${verb} when the controller's node id is known!`,
			ZWaveErrorCodes.Driver_NotReady,
		);
	} else if (!this.driver.securityManager2) {
		throw new ZWaveError(
			`Secure commands (S2) can only be ${verb} when the network keys for the driver are set!`,
			ZWaveErrorCodes.Driver_NoSecurity,
		);
	}
}

@API(CommandClasses["Security 2"])
export class Security2CCAPI extends CCAPI {
	public supportsCommand(_cmd: Security2Command): Maybe<boolean> {
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

		if (!this.driver.securityManager2) {
			throw new ZWaveError(
				`Nonces can only be sent if secure communication is set up!`,
				ZWaveErrorCodes.Driver_NoSecurity,
			);
		}

		const receiverEI = this.driver.securityManager2.generateNonce(
			this.endpoint.nodeId,
		);

		const cc = new Security2CCNonceReport(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
			SOS: true,
			MOS: false,
			receiverEI,
		});

		const SendDataConstructor = this.driver.controller.isFunctionSupported(
			FunctionType.SendDataBridge,
		)
			? SendDataBridgeRequest
			: SendDataRequest;
		const msg = new SendDataConstructor(this.driver, {
			command: cc,
			// Seems we need these options or some nodes won't accept the nonce
			transmitOptions: TransmitOptions.ACK | TransmitOptions.AutoRoute,
			// Only try sending a nonce once
			maxSendAttempts: 1,
		});

		try {
			await this.driver.sendMessage(msg, {
				...this.commandOptions,
				// Nonce requests must be handled immediately
				priority: MessagePriority.Handshake,
				// We don't want failures causing us to treat the node as asleep or dead
				changeNodeStatusOnMissingACK: false,
			});
		} catch (e) {
			if (isTransmissionError(e)) {
				// The nonce could not be sent, invalidate it
				this.driver.securityManager2.deleteNonce(this.endpoint.nodeId);
				return false;
			} else {
				// Pass other errors through
				throw e;
			}
		}
		return true;
	}

	/**
	 * Requests a nonce from the target node
	 */
	public async requestNonce(): Promise<void> {
		this.assertSupportsCommand(Security2Command, Security2Command.NonceGet);

		this.assertPhysicalEndpoint(this.endpoint);

		if (!this.driver.securityManager2) {
			throw new ZWaveError(
				`Nonces can only be sent if secure communication is set up!`,
				ZWaveErrorCodes.Driver_NoSecurity,
			);
		}

		const cc = new Security2CCNonceGet(this.driver, {
			nodeId: this.endpoint.nodeId,
			endpoint: this.endpoint.index,
		});

		await this.driver.sendCommand(cc, {
			...this.commandOptions,
			priority: MessagePriority.PreTransmitHandshake,
			// Only try getting a nonce once
			maxSendAttempts: 1,
			// We don't want failures causing us to treat the node as asleep or dead
			// The "real" transaction will do that for us
			changeNodeStatusOnMissingACK: false,
		});
	}
}

@commandClass(CommandClasses["Security 2"])
@implementedVersion(1)
export class Security2CC extends CommandClass {
	declare ccCommand: Security2Command;

	/** Tests if a command should be sent secure and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		// Everything that's not an S2 CC needs to be encapsulated if the CC is secure
		if (!cc.secure) return true;
		if (!(cc instanceof Security2CC)) return true;
		// These S2 commands need additional encapsulation
		switch (cc.ccCommand) {
			case Security2Command.CommandsSupportedGet:
			case Security2Command.CommandsSupportedReport:
			case Security2Command.NetworkKeyGet:
			case Security2Command.NetworkKeyReport:
			case Security2Command.NetworkKeyVerify:
				return true;
		}
		return false;
	}

	/** Encapsulates a command that should be sent encrypted */
	public static encapsulate(
		driver: Driver,
		cc: CommandClass,
	): Security2CCMessageEncapsulation {
		return new Security2CCMessageEncapsulation(driver, {
			nodeId: cc.nodeId,
			encapsulated: cc,
		});
	}
}

interface Security2CCMessageEncapsulationOptions extends CCCommandOptions {
	extensions?: Security2Extension[];
	encapsulated: CommandClass;
}

function getCCResponseForMessageEncapsulation(
	sent: Security2CCMessageEncapsulation,
) {
	if (sent.encapsulated?.expectsCCResponse()) {
		return Security2CCMessageEncapsulation;
	}
	// TODO: Do some extensions expect a response?
}

@CCCommand(Security2Command.MessageEncapsulation)
@expectedCCResponse(
	getCCResponseForMessageEncapsulation,
	() => "checkEncapsulated",
)
export class Security2CCMessageEncapsulation extends Security2CC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| Security2CCMessageEncapsulationOptions,
	) {
		super(driver, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 2);
			// Check the sequence number to avoid duplicates
			// TODO: distinguish between multicast and singlecast
			this._sequenceNumber = this.payload[0];
			// Don't accept duplicate commands
			validateSequenceNumber.call(this, this._sequenceNumber);

			// Ensure the node has a security class
			const peerNodeID = this.nodeId as number;
			validatePayload.withReason("No security class granted")(
				this.driver.securityManager2!.getHighestSecurityClassSinglecast(
					peerNodeID,
				) != undefined,
			);

			const hasExtensions = !!(this.payload[1] & 0b1);
			const hasEncryptedExtensions = !!(this.payload[1] & 0b10);

			let offset = 2;
			this.extensions = [];
			const parseExtensions = (buffer: Buffer) => {
				while (true) {
					// we need to read at least the length byte
					validatePayload(buffer.length >= offset + 1);
					const extensionLength =
						Security2Extension.getExtensionLength(
							buffer.slice(offset),
						);
					// Parse the extension
					const ext = Security2Extension.from(
						buffer.slice(offset, offset + extensionLength),
					);
					this.extensions.push(ext);
					offset += extensionLength;
					// Check if that was the last extension
					if (!ext.moreToFollow) break;
				}
			};
			if (hasExtensions) parseExtensions(this.payload);

			const spanState =
				this.driver.securityManager2!.getSPANState(peerNodeID);
			if (spanState.type !== SPANState.SPAN) {
				// If no SPAN was established yet, we can't decode this further
				// Figure out what to do

				const failNoSPAN = () => {
					return validatePayload.fail(
						ZWaveErrorCodes.Security2CC_NoSPAN,
					);
				};

				if (spanState.type === SPANState.None) {
					return failNoSPAN();
				} else if (spanState.type === SPANState.RemoteEI) {
					// TODO: The specs are not clear how to handle this case
					// For now, do the same as if we didn't have any EI
					return failNoSPAN();
				} else if (spanState.type === SPANState.LocalEI) {
					// We've sent the other our receiver's EI and received its sender's EI,
					// meaning we can now establish an SPAN
					const senderEI = this.getSenderEI();
					if (!senderEI) return failNoSPAN();
					const receiverEI = spanState.receiverEI;
					this.driver.securityManager2!.initializeSPAN(
						peerNodeID,
						senderEI,
						receiverEI,
					);
				}
			}

			// Now we do have an SPAN
			const unencryptedPayload = this.payload.slice(0, offset);
			const ciphertext = this.payload.slice(
				offset,
				-SECURITY_S2_AUTH_TAG_LENGTH,
			);
			const authTag = this.payload.slice(-SECURITY_S2_AUTH_TAG_LENGTH);

			const messageLength =
				super.computeEncapsulationOverhead() + this.payload.length;
			const authData = getAuthenticationData(
				this.nodeId as number,
				this.getDestinationIDRX(),
				this.driver.controller.homeId!,
				messageLength,
				unencryptedPayload,
			);

			// Decrypt payload and verify integrity
			const { keyCCM: key } = this.driver.securityManager2!.getKeys({
				nodeId: peerNodeID,
			});
			const iv = this.driver.securityManager2!.nextNonce(peerNodeID);
			const { plaintext, authOK } = decryptAES128CCM(
				key,
				iv,
				ciphertext,
				authData,
				authTag,
			);
			validatePayload.withReason(
				"Message authentication failed, won't accept security encapsulated command.",
			)(authOK);

			offset = 0;
			if (hasEncryptedExtensions) parseExtensions(plaintext);

			// Not every S2 message includes an encapsulated CC
			const decryptedCCBytes = plaintext.slice(offset);
			if (decryptedCCBytes.length > 0) {
				// make sure this contains a complete CC command that's worth splitting
				validatePayload(decryptedCCBytes.length >= 2);
				// and deserialize the CC
				this.encapsulated = CommandClass.from(this.driver, {
					data: decryptedCCBytes,
					fromEncapsulation: true,
					encapCC: this,
				});
			}
		} else {
			this.encapsulated = options.encapsulated;
			options.encapsulated.encapsulatingCC = this as any;

			this.extensions = options.extensions ?? [];
			if (
				typeof this.nodeId !== "number" &&
				!this.extensions.some((e) => e instanceof MGRPExtension)
			) {
				throw new ZWaveError(
					"Multicast Security S2 encapsulation requires the MGRP extension",
					ZWaveErrorCodes.Security2CC_MissingExtension,
				);
			}
		}
	}

	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			this._sequenceNumber =
				this.driver.securityManager2!.nextSequenceNumber(
					this.nodeId as number,
				);
		}
		return this._sequenceNumber;
	}

	public encapsulated?: CommandClass;
	public extensions: Security2Extension[];

	private getDestinationIDTX(): number {
		const mgrpExtension = this.extensions.find(
			(e): e is MGRPExtension => e instanceof MGRPExtension,
		);
		if (mgrpExtension) return mgrpExtension.groupId;
		else if (typeof this.nodeId === "number") return this.nodeId;

		throw new ZWaveError(
			"Multicast Security S2 encapsulation requires the MGRP extension",
			ZWaveErrorCodes.Security2CC_MissingExtension,
		);
	}

	private getDestinationIDRX(): number {
		const mgrpExtension = this.extensions.find(
			(e): e is MGRPExtension => e instanceof MGRPExtension,
		);
		if (mgrpExtension) return mgrpExtension.groupId;
		return this.driver.controller.ownNodeId!;
	}

	/** Returns the Sender's Entropy Input if this command contains an SPAN extension */
	private getSenderEI(): Buffer | undefined {
		const spanExtension = this.extensions.find(
			(e): e is SPANExtension => e instanceof SPANExtension,
		);
		return spanExtension?.senderEI;
	}

	public requiresPreTransmitHandshake(): boolean {
		// We need the receiver's EI to be able to send an encrypted command
		const secMan = this.driver.securityManager2!;
		const peerNodeId = this.nodeId as number;
		const spanState = secMan.getSPANState(peerNodeId);
		return (
			spanState.type === SPANState.None ||
			spanState.type === SPANState.LocalEI
		);
	}

	public async preTransmitHandshake(): Promise<void> {
		// Request a nonce
		return this.getNode()!.commandClasses["Security 2"].requestNonce();
		// Yeah, that's it :)
	}

	public serialize(): Buffer {
		// TODO: Support Multicast
		const peerNodeID = this.nodeId as number;

		// Include Sender EI in the command if we only have the receiver's EI
		const spanState =
			this.driver.securityManager2!.getSPANState(peerNodeID);
		if (
			spanState.type === SPANState.None ||
			spanState.type === SPANState.LocalEI
		) {
			// Can't do anything here if we don't have the receiver's EI
			throw new ZWaveError(
				`Security S2 CC requires the receiver's nonce to be sent!`,
				ZWaveErrorCodes.Security2CC_NoSPAN,
			);
		} else if (spanState.type === SPANState.RemoteEI) {
			// We have the receiver's EI, generate our input and send it over
			// With both, we can create an SPAN
			const senderEI =
				this.driver.securityManager2!.generateNonce(undefined);
			const receiverEI = spanState.receiverEI;
			this.driver.securityManager2!.initializeSPAN(
				peerNodeID,
				senderEI,
				receiverEI,
			);

			// Add or update the SPAN extension
			let spanExtension = this.extensions.find(
				(e): e is SPANExtension => e instanceof SPANExtension,
			);
			if (spanExtension) {
				spanExtension.senderEI = senderEI;
			} else {
				spanExtension = new SPANExtension({ senderEI });
				this.extensions.push(spanExtension);
			}
		}

		const unencryptedExtensions = this.extensions.filter(
			(e) => !e.isEncrypted(),
		);
		const encryptedExtensions = this.extensions.filter((e) =>
			e.isEncrypted(),
		);

		const unencryptedPayload = Buffer.concat([
			Buffer.from([
				this.sequenceNumber,
				(encryptedExtensions.length > 0 ? 0b10 : 0) |
					(unencryptedExtensions.length > 0 ? 1 : 0),
			]),
			...unencryptedExtensions.map((e, index) =>
				e.serialize(index < unencryptedExtensions.length - 1),
			),
		]);
		const serializedCC = this.encapsulated?.serialize() ?? Buffer.from([]);
		const plaintextPayload = Buffer.concat([
			...encryptedExtensions.map((e, index) =>
				e.serialize(index < encryptedExtensions.length - 1),
			),
			serializedCC,
		]);

		// Generate the authentication data for CCM encryption
		const messageLength =
			this.computeEncapsulationOverhead() + serializedCC.length;
		const authData = getAuthenticationData(
			this.driver.controller.ownNodeId!,
			this.getDestinationIDTX(),
			this.driver.controller.homeId!,
			messageLength,
			unencryptedPayload,
		);

		const { keyCCM: key } = this.driver.securityManager2!.getKeys({
			nodeId: peerNodeID,
		});
		const iv = this.driver.securityManager2!.nextNonce(peerNodeID);
		const { ciphertext: ciphertextPayload, authTag } = encryptAES128CCM(
			key,
			iv,
			plaintextPayload,
			authData,
			SECURITY_S2_AUTH_TAG_LENGTH,
		);

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
			super.computeEncapsulationOverhead() +
			2 +
			SECURITY_S2_AUTH_TAG_LENGTH +
			extensionBytes
		);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			sequenceNumber: this.sequenceNumber,
		};
		if (this.extensions.length > 0) {
			message.extensions = this.extensions
				.map((e) => e.toLogEntry())
				.join("");
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

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
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| (CCCommandOptions & Security2CCNonceReportOptions),
	) {
		super(driver, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);

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
				this.receiverEI = this.payload.slice(2, 18);

				// In that case we also need to store it, so the next sent command
				// can use it for encryption
				this.driver.securityManager2!.storeRemoteEI(
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

	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			this._sequenceNumber =
				this.driver.securityManager2!.nextSequenceNumber(
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
}

@CCCommand(Security2Command.NonceGet)
@expectedCCResponse(Security2CCNonceReport)
export class Security2CCNonceGet extends Security2CC {
	// TODO: A node sending this command MUST accept a delay up to <Previous Round-trip-time to peer node> +
	// 250 ms before receiving the Security 2 Nonce Report Command.

	public constructor(driver: Driver, options: CCCommandOptions) {
		super(driver, options);

		// Make sure that we can send/receive secure commands
		assertSecurity.call(this, options);

		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 1);
			this._sequenceNumber = this.payload[0];
			// Don't accept duplicate commands
			validateSequenceNumber.call(this, this._sequenceNumber);
		} else {
			// No options here
		}
	}

	private _sequenceNumber: number | undefined;
	/**
	 * Return the sequence number of this command.
	 *
	 * **WARNING:** If the sequence number hasn't been set before, this will create a new one.
	 * When sending messages, this should only happen immediately before serializing.
	 */
	public get sequenceNumber(): number {
		if (this._sequenceNumber == undefined) {
			this._sequenceNumber =
				this.driver.securityManager2!.nextSequenceNumber(
					this.nodeId as number,
				);
		}
		return this._sequenceNumber;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.sequenceNumber]);
		return super.serialize();
	}
}

@CCCommand(Security2Command.KEXReport)
export class Security2CCKEXReport extends Security2CC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 4);
		this.requestCSA = !!(this.payload[0] & 0b10);
		this.echo = !!(this.payload[0] & 0b1);
		this.supportedKEXSchemes = parseBitMask(this.payload.slice(1, 2), 0);
		this.supportedECDHProfiles = parseBitMask(
			this.payload.slice(2, 3),
			ECDHProfiles.Curve25519,
		);
		this.requestedKeys = parseBitMask(
			this.payload.slice(3, 4),
			SecurityClass.S2_Unauthenticated,
		);
	}

	public readonly requestCSA: boolean;
	public readonly echo: boolean;
	public readonly supportedKEXSchemes: readonly KEXSchemes[];
	public readonly supportedECDHProfiles: readonly ECDHProfiles[];
	public readonly requestedKeys: readonly SecurityClass[];
}

@CCCommand(Security2Command.KEXGet)
@expectedCCResponse(Security2CCKEXReport)
export class Security2CCKEXGet extends Security2CC {}

interface Security2CCKEXSetOptions extends CCCommandOptions {
	requestCSA: boolean;
	echo: boolean;
	supportedKEXSchemes: KEXSchemes[];
	supportedECDHProfiles: ECDHProfiles[];
	requestedKeys: SecurityClass[];
}

@CCCommand(Security2Command.KEXSet)
export class Security2CCKEXSet extends Security2CC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | Security2CCKEXSetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.requestCSA = options.requestCSA;
			this.echo = options.echo;
			this.selectedKEXSchemes = options.supportedKEXSchemes;
			this.selectedECDHProfiles = options.supportedECDHProfiles;
			this.grantedKeys = options.requestedKeys;
		}
	}

	public requestCSA: boolean;
	public echo: boolean;
	public selectedKEXSchemes: KEXSchemes[];
	public selectedECDHProfiles: ECDHProfiles[];
	public grantedKeys: SecurityClass[];

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([(this.requestCSA ? 0b10 : 0) + (this.echo ? 0b1 : 0)]),
			encodeBitMask(this.selectedKEXSchemes, 8, KEXSchemes.KEXScheme1),
			encodeBitMask(
				this.selectedECDHProfiles,
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
}

interface Security2CCKEXFailOptions extends CCCommandOptions {
	failType: KEXFailType;
}

@CCCommand(Security2Command.KEXFail)
export class Security2CCKEXFail extends Security2CC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | Security2CCKEXFailOptions,
	) {
		super(driver, options);
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
}

interface Security2CCPublicKeyReportOptions extends CCCommandOptions {
	includingNode: boolean;
	publicKey: Buffer;
}

@CCCommand(Security2Command.PublicKeyReport)
export class Security2CCPublicKeyReport extends Security2CC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| Security2CCPublicKeyReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length >= 17);
			this.includingNode = !!(this.payload[0] & 0b1);
			this.publicKey = this.payload.slice(1);
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
}

interface Security2CCNetworkKeyReportOptions extends CCCommandOptions {
	grantedKey: SecurityClass;
	networkKey: Buffer;
}

@CCCommand(Security2Command.NetworkKeyReport)
export class Security2CCNetworkKeyReport extends Security2CC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| Security2CCNetworkKeyReportOptions,
	) {
		super(driver, options);
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
}

interface Security2CCNetworkKeyGetOptions extends CCCommandOptions {
	requestedKey: SecurityClass;
}

@CCCommand(Security2Command.NetworkKeyGet)
@expectedCCResponse(Security2CCNetworkKeyReport)
export class Security2CCNetworkKeyGet extends Security2CC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| Security2CCNetworkKeyGetOptions,
	) {
		super(driver, options);
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
}

@CCCommand(Security2Command.NetworkKeyVerify)
export class Security2CCNetworkKeyVerify extends Security2CC {}

interface Security2CCTransferEndOptions extends CCCommandOptions {
	keyVerified: boolean;
	keyRequestComplete: boolean;
}

@CCCommand(Security2Command.TransferEnd)
export class Security2CCTransferEnd extends Security2CC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| Security2CCTransferEndOptions,
	) {
		super(driver, options);
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
}

@CCCommand(Security2Command.CommandsSupportedReport)
export class Security2CCCommandsSupportedReport extends Security2CC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		const CCs = parseCCList(this.payload);

		// SDS13783: A sending node MAY terminate the list of supported command classes with the
		// COMMAND_CLASS_MARK command class identifier.
		// A receiving node MUST stop parsing the list of supported command classes if it detects the
		// COMMAND_CLASS_MARK command class identifier in the Security 2 Commands Supported Report
		this.supportedCCs = CCs.supportedCCs;
	}

	public readonly supportedCCs: CommandClasses[];
}

@CCCommand(Security2Command.CommandsSupportedGet)
@expectedCCResponse(Security2CCCommandsSupportedReport)
export class Security2CCCommandsSupportedGet extends Security2CC {}
