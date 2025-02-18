import { type CCEncodingContext, type CCParsingContext } from "@zwave-js/cc";
import {
	CommandClasses,
	EncapsulationFlags,
	type GetValueDB,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	SecurityClass,
	type SecurityManager,
	TransmitOptions,
	type WithAddress,
	ZWaveError,
	ZWaveErrorCodes,
	computeMAC,
	decryptAES128OFB,
	encodeCCList,
	encryptAES128OFB,
	generateAuthKey,
	generateEncryptionKey,
	getCCName,
	isTransmissionError,
	parseCCList,
	randomBytes,
	validatePayload,
} from "@zwave-js/core";
import { type MaybeNotKnown } from "@zwave-js/core/safe";
import { Bytes } from "@zwave-js/shared/safe";
import { buffer2hex, num2hex, pick } from "@zwave-js/shared/safe";
import { wait } from "alcalzone-shared/async";
import { CCAPI, PhysicalCCAPI } from "../lib/API.js";
import {
	type CCRaw,
	CommandClass,
	type InterviewContext,
} from "../lib/CommandClass.js";
import {
	API,
	CCCommand,
	commandClass,
	expectedCCResponse,
	implementedVersion,
} from "../lib/CommandClassDecorators.js";
import { SecurityCommand } from "../lib/_Types.js";
import { CRC16CC } from "./CRC16CC.js";
import { Security2CC } from "./Security2CC.js";
import { TransportServiceCC } from "./TransportServiceCC.js";

// @noSetValueAPI This is an encapsulation CC

function getAuthenticationData(
	senderNonce: Uint8Array,
	receiverNonce: Uint8Array,
	ccCommand: SecurityCommand,
	sendingNodeId: number,
	receivingNodeId: number,
	encryptedPayload: Uint8Array,
): Uint8Array {
	return Bytes.concat([
		senderNonce,
		receiverNonce,
		Bytes.from([
			ccCommand,
			sendingNodeId,
			receivingNodeId,
			encryptedPayload.length,
		]),
		encryptedPayload,
	]);
}

function throwNoNonce(reason?: string): never {
	let message = `Security CC requires a nonce to be sent!`;
	if (reason) message += ` Reason: ${reason}`;
	throw new ZWaveError(message, ZWaveErrorCodes.SecurityCC_NoNonce);
}

const HALF_NONCE_SIZE = 8;

function assertSecurityRX(
	ctx: CCParsingContext,
): asserts ctx is CCParsingContext & { securityManager: SecurityManager } {
	if (!ctx.ownNodeId) {
		throw new ZWaveError(
			`Secure commands (S0) can only be decoded when the controller's node id is known!`,
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	if (!ctx.securityManager) {
		throw new ZWaveError(
			`Secure commands (S0) can only be decoded when the security manager is set up!`,
			ZWaveErrorCodes.Driver_NoSecurity,
		);
	}
}

function assertSecurityTX(
	ctx: CCEncodingContext,
): asserts ctx is CCEncodingContext & { securityManager: SecurityManager } {
	if (!ctx.ownNodeId) {
		throw new ZWaveError(
			`Secure commands (S0) can only be sent when the controller's node id is known!`,
			ZWaveErrorCodes.Driver_NotReady,
		);
	}

	if (!ctx.securityManager) {
		throw new ZWaveError(
			`Secure commands (S0) can only be sent when the security manager is set up!`,
			ZWaveErrorCodes.Driver_NoSecurity,
		);
	}
}

// TODO: Ignore commands if received via multicast

// Encapsulation CCs are used internally and too frequently that we
// want to pay the cost of validating each call
/* eslint-disable @zwave-js/ccapi-validate-args */

@API(CommandClasses.Security)
export class SecurityCCAPI extends PhysicalCCAPI {
	public supportsCommand(_cmd: SecurityCommand): MaybeNotKnown<boolean> {
		// All commands are mandatory
		return true;
	}

	public async sendEncapsulated(
		encapsulated: CommandClass,
		requestNextNonce: boolean = false,
	): Promise<void> {
		if (requestNextNonce) {
			this.assertSupportsCommand(
				SecurityCommand,
				SecurityCommand.CommandEncapsulation,
			);
		} else {
			this.assertSupportsCommand(
				SecurityCommand,
				SecurityCommand.CommandEncapsulationNonceGet,
			);
		}

		const cc = new (
			requestNextNonce
				? SecurityCCCommandEncapsulationNonceGet
				: SecurityCCCommandEncapsulation
		)({
			nodeId: this.endpoint.nodeId,
			encapsulated,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	/**
	 * Requests a new nonce for Security CC encapsulation which is not directly linked to a specific command.
	 */
	public async getNonce(): Promise<Uint8Array | undefined> {
		this.assertSupportsCommand(SecurityCommand, SecurityCommand.NonceGet);

		const cc = new SecurityCCNonceGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<SecurityCCNonceReport>(
			cc,
			{
				...this.commandOptions,
				// Only try getting a nonce once
				maxSendAttempts: 1,
			},
		);
		if (!response) return;

		const nonce = response.nonce;
		const secMan = this.host.securityManager!;
		secMan.setNonce(
			{
				issuer: this.endpoint.nodeId,
				nonceId: secMan.getNonceId(nonce),
			},
			{ nonce, receiver: this.host.ownNodeId },
			{ free: true },
		);
		return nonce;
	}

	/**
	 * Responds to a NonceGet request. The message is sent without any retransmission etc.
	 * The return value indicates whether a nonce was successfully sent
	 */
	public async sendNonce(): Promise<boolean> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.NonceReport,
		);

		if (!this.host.securityManager) {
			throw new ZWaveError(
				`Nonces can only be sent if secure communication is set up!`,
				ZWaveErrorCodes.Driver_NoSecurity,
			);
		}

		const nonce = this.host.securityManager.generateNonce(
			this.endpoint.nodeId,
			HALF_NONCE_SIZE,
		);
		const nonceId = this.host.securityManager.getNonceId(nonce);

		const cc = new SecurityCCNonceReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			nonce,
		});

		try {
			await this.host.sendCommand(cc, {
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
				// The nonce could not be sent, invalidate it
				this.host.securityManager.deleteNonce(nonceId);
				return false;
			} else {
				// Pass other errors through
				throw e;
			}
		}
		return true;
	}

	public async getSecurityScheme(): Promise<[0]> {
		this.assertSupportsCommand(SecurityCommand, SecurityCommand.SchemeGet);

		const cc = new SecurityCCSchemeGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		await this.host.sendCommand(cc, this.commandOptions);
		// There is only one scheme, so we hardcode it
		return [0];
	}

	public async reportSecurityScheme(encapsulated: boolean): Promise<void> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.SchemeReport,
		);

		let cc: CommandClass = new SecurityCCSchemeReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		if (encapsulated) {
			cc = new SecurityCCCommandEncapsulation({
				nodeId: this.endpoint.nodeId,
				endpointIndex: this.endpoint.index,
				encapsulated: cc,
			});
		}
		await this.host.sendCommand(cc, this.commandOptions);
	}

	public async inheritSecurityScheme(): Promise<void> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.SchemeInherit,
		);

		const cc = new SecurityCCSchemeInherit({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		await this.host.sendCommand(cc, this.commandOptions);
		// There is only one scheme, so we don't return anything here
	}

	public async setNetworkKey(networkKey: Uint8Array): Promise<void> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.NetworkKeySet,
		);

		const keySet = new SecurityCCNetworkKeySet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			networkKey,
		});
		const cc = new SecurityCCCommandEncapsulation({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			encapsulated: keySet,
			alternativeNetworkKey: new Uint8Array(16).fill(0),
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	public async verifyNetworkKey(): Promise<void> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.NetworkKeyVerify,
		);

		const cc = new SecurityCCNetworkKeyVerify({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}

	// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
	public async getSupportedCommands() {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.CommandsSupportedGet,
		);

		const cc = new SecurityCCCommandsSupportedGet({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
		});
		const response = await this.host.sendCommand<
			SecurityCCCommandsSupportedReport
		>(
			cc,
			this.commandOptions,
		);
		if (response) {
			return pick(response, ["supportedCCs", "controlledCCs"]);
		}
	}

	public async reportSupportedCommands(
		supportedCCs: CommandClasses[],
		controlledCCs: CommandClasses[],
	): Promise<void> {
		this.assertSupportsCommand(
			SecurityCommand,
			SecurityCommand.CommandsSupportedReport,
		);

		const cc = new SecurityCCCommandsSupportedReport({
			nodeId: this.endpoint.nodeId,
			endpointIndex: this.endpoint.index,
			supportedCCs,
			controlledCCs,
			reportsToFollow: 0,
		});
		await this.host.sendCommand(cc, this.commandOptions);
	}
}

@commandClass(CommandClasses.Security)
@implementedVersion(1)
export class SecurityCC extends CommandClass {
	declare ccCommand: SecurityCommand;
	// Force singlecast for the Security CC
	declare nodeId: number;

	public async interview(
		ctx: InterviewContext,
	): Promise<void> {
		const node = this.getNode(ctx)!;
		const endpoint = this.getEndpoint(ctx)!;
		const api = CCAPI.create(
			CommandClasses.Security,
			ctx,
			endpoint,
		).withOptions({
			priority: MessagePriority.NodeQuery,
		});

		ctx.logNode(node.id, {
			message: "Querying securely supported commands (S0)...",
			direction: "outbound",
		});

		let supportedCCs: CommandClasses[] | undefined;
		let controlledCCs: CommandClasses[] | undefined;

		// Try up to 3 times on the root device. We REALLY don't want a spurious timeout or collision to cause us to discard a known good security class
		const MAX_ATTEMPTS = this.endpointIndex === 0 ? 3 : 1;
		for (let attempts = 1; attempts <= MAX_ATTEMPTS; attempts++) {
			const resp = await api.getSupportedCommands();
			if (resp) {
				supportedCCs = resp.supportedCCs;
				controlledCCs = resp.controlledCCs;
				break;
			} else if (attempts < MAX_ATTEMPTS) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message:
						`Querying securely supported commands (S0), attempt ${attempts}/${MAX_ATTEMPTS} failed. Retrying in 500ms...`,
					level: "warn",
				});
				await wait(500);
			}
		}

		if (!supportedCCs || !controlledCCs) {
			if (node.hasSecurityClass(SecurityClass.S0_Legacy) === true) {
				ctx.logNode(node.id, {
					endpoint: this.endpointIndex,
					message: "Querying securely supported commands (S0) failed",
					level: "warn",
				});
				// TODO: Abort interview?
			} else {
				// We didn't know if the node was secure and it didn't respond,
				// assume that it doesn't have the S0 security class
				ctx.logNode(
					node.id,
					`The node was not granted the S0 security class. Continuing interview non-securely.`,
				);
				node.setSecurityClass(SecurityClass.S0_Legacy, false);
			}
			return;
		}

		const logLines: string[] = [
			"received secure commands (S0)",
			"supported CCs:",
		];
		for (const cc of supportedCCs) {
			logLines.push(`· ${getCCName(cc)}`);
		}
		logLines.push("controlled CCs:");
		for (const cc of controlledCCs) {
			logLines.push(`· ${getCCName(cc)}`);
		}
		ctx.logNode(node.id, {
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
		for (const cc of controlledCCs) {
			// Basic CC has special rules for when it is considered supported
			// Therefore we mark all other CCs as supported, but not Basic CC,
			// for which support is determined later.
			if (cc === CommandClasses.Basic) {
				endpoint.addCC(cc, { secure: true });
			} else {
				endpoint.addCC(cc, {
					isControlled: true,
					secure: true,
				});
			}
		}

		// We know for sure that the node is included securely
		if (node.hasSecurityClass(SecurityClass.S0_Legacy) !== true) {
			node.setSecurityClass(SecurityClass.S0_Legacy, true);
			ctx.logNode(
				node.id,
				`The node was granted the S0 security class`,
			);
		}

		// Remember that the interview is complete
		this.setInterviewComplete(ctx, true);
	}

	/** Tests if a command should be sent secure and thus requires encapsulation */
	public static requiresEncapsulation(cc: CommandClass): boolean {
		// No security flag -> no encapsulation
		if (!(cc.encapsulationFlags & EncapsulationFlags.Security)) {
			return false;
		}

		// S2, CRC16, Transport Service -> no S2 encapsulation
		if (
			cc instanceof Security2CC
			|| cc instanceof CRC16CC
			|| cc instanceof TransportServiceCC
		) {
			return false;
		}

		// S0: check command
		if (cc instanceof SecurityCC) {
			switch (cc.ccCommand) {
				// Already encapsulated
				case SecurityCommand.CommandEncapsulation:
				case SecurityCommand.CommandEncapsulationNonceGet:
				// Cannot be sent encapsulated:
				case SecurityCommand.NonceGet:
				case SecurityCommand.NonceReport:
				case SecurityCommand.SchemeGet:
				case SecurityCommand.SchemeReport:
					return false;

				default:
					// All other commands must be encapsulated
					return true;
			}
		}

		// Everything else needs to be encapsulated if the CC is secure
		return true;
	}

	/** Encapsulates a command that should be sent encrypted */
	public static encapsulate(
		ownNodeId: number,
		securityManager: SecurityManager,
		cc: CommandClass,
	): SecurityCCCommandEncapsulation {
		// TODO: When to return a SecurityCCCommandEncapsulationNonceGet?
		const ret = new SecurityCCCommandEncapsulation({
			nodeId: cc.nodeId,
			encapsulated: cc,
		});

		// Copy the encapsulation flags from the encapsulated command
		// but omit Security, since we're doing that right now
		ret.encapsulationFlags = cc.encapsulationFlags
			& ~EncapsulationFlags.Security;

		return ret;
	}
}

interface SecurityCCNonceReportOptions {
	nonce: Uint8Array;
}

@CCCommand(SecurityCommand.NonceReport)
export class SecurityCCNonceReport extends SecurityCC {
	constructor(
		options: WithAddress<SecurityCCNonceReportOptions>,
	) {
		super(options);
		if (options.nonce.length !== HALF_NONCE_SIZE) {
			throw new ZWaveError(
				`Nonce must have length ${HALF_NONCE_SIZE}!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.nonce = options.nonce;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SecurityCCNonceReport {
		validatePayload.withReason("Invalid nonce length")(
			raw.payload.length === HALF_NONCE_SIZE,
		);

		return new this({
			nodeId: ctx.sourceNodeId,
			nonce: raw.payload,
		});
	}

	public nonce: Uint8Array;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.view(this.nonce);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: { nonce: buffer2hex(this.nonce) },
		};
	}
}

@CCCommand(SecurityCommand.NonceGet)
@expectedCCResponse(SecurityCCNonceReport)
export class SecurityCCNonceGet extends SecurityCC {}

// @publicAPI
export type SecurityCCCommandEncapsulationOptions =
	& {
		alternativeNetworkKey?: Uint8Array;
	}
	& ({
		encapsulated: CommandClass;
	} | {
		decryptedCCBytes: Uint8Array;
		sequenced: boolean;
		secondFrame: boolean;
		sequenceCounter: number;
	});

function getCCResponseForCommandEncapsulation(
	sent: SecurityCCCommandEncapsulation,
) {
	if (sent.encapsulated.expectsCCResponse()) {
		return SecurityCCCommandEncapsulation;
	}
}

@CCCommand(SecurityCommand.CommandEncapsulation)
@expectedCCResponse(
	getCCResponseForCommandEncapsulation,
	() => "checkEncapsulated",
)
export class SecurityCCCommandEncapsulation extends SecurityCC {
	public constructor(
		options: WithAddress<SecurityCCCommandEncapsulationOptions>,
	) {
		super(options);

		if ("encapsulated" in options) {
			this.encapsulated = options.encapsulated;
			this.encapsulated.encapsulatingCC = this as any;
		} else {
			this.decryptedCCBytes = options.decryptedCCBytes;
			this.sequenced = options.sequenced;
			this.secondFrame = options.secondFrame;
			this.sequenceCounter = options.sequenceCounter;
		}
		this.alternativeNetworkKey = options.alternativeNetworkKey;
	}

	public static async from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): Promise<SecurityCCCommandEncapsulation> {
		assertSecurityRX(ctx);

		// HALF_NONCE_SIZE bytes iv, 1 byte frame control, at least 1 CC byte, 1 byte nonce id, 8 bytes auth code
		validatePayload(
			raw.payload.length >= HALF_NONCE_SIZE + 1 + 1 + 1 + 8,
		);
		const iv = raw.payload.subarray(0, HALF_NONCE_SIZE);
		const encryptedPayload = raw.payload.subarray(HALF_NONCE_SIZE, -9);
		const nonceId = raw.payload.at(-9)!;
		const authCode = raw.payload.subarray(-8);

		// Retrieve the used nonce from the nonce store
		const nonce = ctx.securityManager.getNonce(nonceId);
		// Only accept the message if the nonce hasn't expired
		if (!nonce) {
			validatePayload.fail(
				`Nonce ${
					num2hex(
						nonceId,
					)
				} expired, cannot decode security encapsulated command.`,
			);
		}
		// and mark the nonce as used
		ctx.securityManager.deleteNonce(nonceId);

		// Validate the encrypted data
		const authData = getAuthenticationData(
			iv,
			nonce,
			SecurityCommand.CommandEncapsulation,
			ctx.sourceNodeId,
			ctx.ownNodeId,
			encryptedPayload,
		);
		const expectedAuthCode = await computeMAC(
			authData,
			await ctx.securityManager.getAuthKey(),
		);
		// Only accept messages with a correct auth code
		validatePayload.withReason(
			"Invalid auth code, won't accept security encapsulated command.",
		)(authCode.equals(expectedAuthCode));

		// Decrypt the encapsulated CC
		const frameControlAndDecryptedCC = await decryptAES128OFB(
			encryptedPayload,
			await ctx.securityManager.getEncryptionKey(),
			Bytes.concat([iv, nonce]),
		);
		const frameControl = frameControlAndDecryptedCC[0];
		const sequenceCounter = frameControl & 0b1111;
		const sequenced = !!(frameControl & 0b1_0000);
		const secondFrame = !!(frameControl & 0b10_0000);
		const decryptedCCBytes: Uint8Array | undefined =
			frameControlAndDecryptedCC
				.subarray(1);

		const ret = new SecurityCCCommandEncapsulation({
			nodeId: ctx.sourceNodeId,
			sequenceCounter,
			sequenced,
			secondFrame,
			decryptedCCBytes,
		});

		ret.authData = authData;
		ret.authCode = authCode;
		ret.iv = iv;

		return ret;
	}

	private sequenced: boolean | undefined;
	private secondFrame: boolean | undefined;
	private sequenceCounter: number | undefined;

	private decryptedCCBytes: Uint8Array | undefined;
	public encapsulated!: CommandClass;

	private alternativeNetworkKey?: Uint8Array;

	public get nonceId(): number | undefined {
		return this.nonce?.[0];
	}
	public nonce: Uint8Array | undefined;

	// Only used testing/for debugging purposes
	private iv?: Uint8Array;
	private authData?: Uint8Array;
	private authCode?: Uint8Array;
	private ciphertext?: Uint8Array;

	public getPartialCCSessionId(): Record<string, any> | undefined {
		if (this.sequenced) {
			return {
				// Treat Encapsulation and EncapsulationNonceGet as one
				ccCommand: undefined,
				sequence: this.sequenceCounter,
			};
		} else {
			return {
				// Treat Encapsulation and EncapsulationNonceGet as one
				ccCommand: undefined,
			};
		}
	}

	public expectMoreMessages(): boolean {
		return !!this.sequenced && !this.secondFrame;
	}

	public async mergePartialCCs(
		partials: SecurityCCCommandEncapsulation[],
		ctx: CCParsingContext,
	): Promise<void> {
		// Concat the CC buffers
		this.decryptedCCBytes = Bytes.concat(
			[...partials, this].map((cc) => cc.decryptedCCBytes!),
		);
		// make sure this contains a complete CC command that's worth splitting
		validatePayload(this.decryptedCCBytes.length >= 2);
		// and deserialize the CC
		this.encapsulated = await CommandClass.parse(
			this.decryptedCCBytes,
			ctx,
		);
		this.encapsulated.encapsulatingCC = this as any;
	}

	public async serialize(ctx: CCEncodingContext): Promise<Bytes> {
		if (!this.nonce) throwNoNonce();
		if (this.nonce.length !== HALF_NONCE_SIZE) {
			throwNoNonce("Invalid nonce size");
		}
		assertSecurityTX(ctx);

		let authKey: Uint8Array;
		let encryptionKey: Uint8Array;
		if (this.alternativeNetworkKey) {
			authKey = await generateAuthKey(this.alternativeNetworkKey);
			encryptionKey = await generateEncryptionKey(
				this.alternativeNetworkKey,
			);
		} else {
			authKey = await ctx.securityManager.getAuthKey();
			encryptionKey = await ctx.securityManager.getEncryptionKey();
		}

		const serializedCC = await this.encapsulated.serialize(ctx);
		const plaintext = Bytes.concat([
			Bytes.from([0]), // TODO: frame control
			serializedCC,
		]);
		// Encrypt the payload
		const senderNonce = randomBytes(HALF_NONCE_SIZE);
		const iv = Bytes.concat([senderNonce, this.nonce]);
		const ciphertext = await encryptAES128OFB(
			plaintext,
			encryptionKey,
			iv,
		);
		// And generate the auth code
		const authData = getAuthenticationData(
			senderNonce,
			this.nonce,
			this.ccCommand,
			ctx.ownNodeId,
			this.nodeId,
			ciphertext,
		);
		const authCode = await computeMAC(authData, authKey);

		// Remember for debugging purposes
		this.iv = iv;
		this.authData = authData;
		this.authCode = authCode;
		this.ciphertext = ciphertext;

		this.payload = Bytes.concat([
			senderNonce,
			ciphertext,
			Bytes.from([this.nonceId!]),
			authCode,
		]);
		return super.serialize(ctx);
	}

	protected computeEncapsulationOverhead(): number {
		// Security CC adds 8 bytes IV, 1 byte frame control, 1 byte nonce ID, 8 bytes MAC
		return super.computeEncapsulationOverhead() + 18;
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		const message: MessageRecord = {};
		if (this.nonceId != undefined) {
			message["nonce id"] = this.nonceId;
		}
		if (this.sequenced != undefined) {
			message.sequenced = this.sequenced;
			if (this.sequenced) {
				if (this.secondFrame != undefined) {
					message["second frame"] = this.secondFrame;
				}
				if (this.sequenceCounter != undefined) {
					message["sequence counter"] = this.sequenceCounter;
				}
			}
		}
		// Log the plaintext in integration tests and development mode
		if (
			process.env.NODE_ENV === "test"
			|| process.env.NODE_ENV === "development"
		) {
			if (this.iv) {
				message.IV = buffer2hex(this.iv);
			}
			if (this.ciphertext) {
				message.ciphertext = buffer2hex(this.ciphertext);
			} else if (this.decryptedCCBytes) {
				message.plaintext = buffer2hex(this.decryptedCCBytes);
			}
			if (this.authData) {
				message["auth data"] = buffer2hex(this.authData);
			}
			if (this.authCode) {
				message["auth code"] = buffer2hex(this.authCode);
			}
		}
		return {
			...super.toLogEntry(ctx),
			message,
		};
	}
}

// This is the same message, but with another CC command
@CCCommand(SecurityCommand.CommandEncapsulationNonceGet)
export class SecurityCCCommandEncapsulationNonceGet
	extends SecurityCCCommandEncapsulation
{}

@CCCommand(SecurityCommand.SchemeReport)
export class SecurityCCSchemeReport extends SecurityCC {
	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SecurityCCSchemeReport {
		validatePayload(raw.payload.length >= 1);
		// The including controller MUST NOT perform any validation of the Supported Security Schemes byte
		return new this({
			nodeId: ctx.sourceNodeId,
		});
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
		this.payload = Bytes.from([0]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			// Hide the default payload line
			message: undefined,
		};
	}
}

@CCCommand(SecurityCommand.SchemeGet)
@expectedCCResponse(SecurityCCSchemeReport)
export class SecurityCCSchemeGet extends SecurityCC {
	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
		this.payload = Bytes.from([0]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			// Hide the default payload line
			message: undefined,
		};
	}
}

@CCCommand(SecurityCommand.SchemeInherit)
@expectedCCResponse(SecurityCCSchemeReport)
export class SecurityCCSchemeInherit extends SecurityCC {
	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
		this.payload = Bytes.from([0]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			// Hide the default payload line
			message: undefined,
		};
	}
}

@CCCommand(SecurityCommand.NetworkKeyVerify)
export class SecurityCCNetworkKeyVerify extends SecurityCC {}

// @publicAPI
export interface SecurityCCNetworkKeySetOptions {
	networkKey: Uint8Array;
}

@CCCommand(SecurityCommand.NetworkKeySet)
@expectedCCResponse(SecurityCCNetworkKeyVerify)
export class SecurityCCNetworkKeySet extends SecurityCC {
	public constructor(
		options: WithAddress<SecurityCCNetworkKeySetOptions>,
	) {
		super(options);
		if (options.networkKey.length !== 16) {
			throw new ZWaveError(
				`The network key must have length 16!`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		this.networkKey = options.networkKey;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SecurityCCNetworkKeySet {
		validatePayload(raw.payload.length >= 16);
		const networkKey: Uint8Array = raw.payload.subarray(0, 16);

		return new this({
			nodeId: ctx.sourceNodeId,
			networkKey,
		});
	}

	public networkKey: Uint8Array;

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.view(this.networkKey);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		// The network key shouldn't be logged, so users can safely post their logs online
		const { message, ...log } = super.toLogEntry(ctx);
		return log;
	}
}

// @publicAPI
export interface SecurityCCCommandsSupportedReportOptions {
	reportsToFollow?: number;
	supportedCCs: CommandClasses[];
	controlledCCs: CommandClasses[];
}

@CCCommand(SecurityCommand.CommandsSupportedReport)
export class SecurityCCCommandsSupportedReport extends SecurityCC {
	public constructor(
		options: WithAddress<SecurityCCCommandsSupportedReportOptions>,
	) {
		super(options);

		this.supportedCCs = options.supportedCCs;
		this.controlledCCs = options.controlledCCs;
		// TODO: properly split the CCs into multiple reports
		this.reportsToFollow = options.reportsToFollow ?? 0;
	}

	public static from(
		raw: CCRaw,
		ctx: CCParsingContext,
	): SecurityCCCommandsSupportedReport {
		validatePayload(raw.payload.length >= 1);
		const reportsToFollow = raw.payload[0];
		const list = parseCCList(raw.payload.subarray(1));
		const supportedCCs: CommandClasses[] = list.supportedCCs;
		const controlledCCs: CommandClasses[] = list.controlledCCs;

		return new this({
			nodeId: ctx.sourceNodeId,
			reportsToFollow,
			supportedCCs,
			controlledCCs,
		});
	}

	public reportsToFollow: number;
	public supportedCCs: CommandClasses[];
	public controlledCCs: CommandClasses[];

	public getPartialCCSessionId(): Record<string, any> | undefined {
		// Nothing special we can distinguish sessions with
		return {};
	}

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	public mergePartialCCs(
		partials: SecurityCCCommandsSupportedReport[],
	): Promise<void> {
		// Concat the lists of CCs
		this.supportedCCs = [...partials, this]
			.map((report) => report.supportedCCs)
			.reduce((prev, cur) => prev.concat(...cur), []);
		this.controlledCCs = [...partials, this]
			.map((report) => report.controlledCCs)
			.reduce((prev, cur) => prev.concat(...cur), []);
		return Promise.resolve();
	}

	public serialize(ctx: CCEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.reportsToFollow]),
			encodeCCList(this.supportedCCs, this.controlledCCs),
		]);
		return super.serialize(ctx);
	}

	public toLogEntry(ctx?: GetValueDB): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(ctx),
			message: {
				reportsToFollow: this.reportsToFollow,
				supportedCCs: this.supportedCCs
					.map((cc) => getCCName(cc))
					.map((cc) => `\n· ${cc}`)
					.join(""),
				controlledCCs: this.controlledCCs
					.map((cc) => getCCName(cc))
					.map((cc) => `\n· ${cc}`)
					.join(""),
			},
		};
	}
}

@CCCommand(SecurityCommand.CommandsSupportedGet)
@expectedCCResponse(SecurityCCCommandsSupportedReport)
export class SecurityCCCommandsSupportedGet extends SecurityCC {}
