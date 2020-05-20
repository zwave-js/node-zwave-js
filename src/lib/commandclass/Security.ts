import { randomBytes } from "crypto";
import type { ZWaveController } from "../controller/Controller";
import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { parseCCList } from "../node/NodeInfo";
import {
	computeMAC,
	decryptAES128OFB,
	encryptAES128OFB,
} from "../security/crypto";
import type { SecurityManager } from "../security/Manager";
import { validatePayload } from "../util/misc";
import {
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
import { CommandClasses } from "./CommandClasses";

// All the supported commands
export enum SecurityCommand {
	CommandsSupportedGet = 0x02,
	CommandsSupportedReport = 0x03,
	SchemeGet = 0x04,
	SchemeReport = 0x05,
	SchemeInherit = 0x08,
	NetworkKeySet = 0x06,
	NetworkKeyVerify = 0x07,
	NonceGet = 0x40,
	NonceReport = 0x80,
	CommandEncapsulation = 0x81,
	CommandEncapsulationNonceGet = 0xc1,
}

function getAuthenticationData(
	senderNonce: Buffer,
	receiverNonce: Buffer,
	sendingNodeId: number,
	receivingNodeId: number,
	encryptedPayload: Buffer,
): Buffer {
	return Buffer.concat([
		senderNonce,
		receiverNonce,
		Buffer.from([sendingNodeId, receivingNodeId, encryptedPayload.length]),
		encryptedPayload,
	]);
}

const HALF_NONCE_SIZE = 8;

// TODO: SDS10865: Nonces are identified in the table by their first byte.
// When generating a new nonce, it is ensured that the new nonce does not have a first byte value that is already contained in one of the table entries.
// If the PRNG returns a nonce whose first byte is already contained in the table, then the process is repeated

// TODO: Ignore commands if received via multicast

@commandClass(CommandClasses.Security)
@implementedVersion(1)
export class SecurityCC extends CommandClass {
	declare ccCommand: SecurityCommand;
	// Force singlecast for the Security CC (for now)
	declare nodeId: number;
	// Define the securityManager and controller.ownNodeId as existing - the constructor will throw if it isn't
	declare driver: Driver & {
		securityManager: SecurityManager;
		controller: ZWaveController & {
			ownNodeId: number;
		};
	};

	public constructor(driver: Driver, options: CommandClassOptions) {
		super(driver, options);
		if (!(this.driver.controller.ownNodeId as unknown)) {
			throw new ZWaveError(
				`Security CC can only be used when the controller's node id is known!`,
				ZWaveErrorCodes.Driver_NotReady,
			);
		} else if (!(this.driver.securityManager as unknown)) {
			throw new ZWaveError(
				`Security CC can only be used when the network key for the driver is set`,
				ZWaveErrorCodes.Driver_NoSecurity,
			);
		}
	}
}

interface SecurityCCNonceReportOptions extends CCCommandOptions {
	nonce: Buffer;
}

@CCCommand(SecurityCommand.NonceReport)
export class SecurityCCNonceReport extends SecurityCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SecurityCCNonceReportOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			validatePayload(this.payload.length === HALF_NONCE_SIZE);
			this.nonce = this.payload;
		} else {
			if (options.nonce.length !== HALF_NONCE_SIZE) {
				throw new ZWaveError(
					`Nonce must have length ${HALF_NONCE_SIZE}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.nonce = options.nonce;
		}
	}

	public nonce: Buffer;

	public serialize(): Buffer {
		this.payload = this.nonce;
		return super.serialize();
	}
}

@CCCommand(SecurityCommand.NonceGet)
@expectedCCResponse(SecurityCCNonceReport)
export class SecurityCCNonceGet extends SecurityCC {}

interface SecurityCCCommandEncapsulationOptions extends CCCommandOptions {
	encapsulated: CommandClass;
	receiverNonce: Buffer;
	receiverNonceId: number;
}

@CCCommand(SecurityCommand.CommandEncapsulation)
// TODO: Implement check for response
export class SecurityCCCommandEncapsulation extends SecurityCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SecurityCCCommandEncapsulationOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// HALF_NONCE_SIZE bytes iv, 1 byte frame control, 2 bytes CC header, 1 byte nonce id, 8 bytes auth code
			validatePayload(
				this.payload.length >= HALF_NONCE_SIZE + 1 + 2 + 1 + 8,
			);
			this.iv = this.payload.slice(0, HALF_NONCE_SIZE);
			// TODO: frame control
			const encryptedCC = this.payload.slice(HALF_NONCE_SIZE + 1, -9);
			this.nonceId = this.payload[this.payload.length - 9];
			const authCode = this.payload.slice(-8);

			// Retrieve the used nonce from the nonce store
			const nonce = this.driver.securityManager.getNonce(this.nonceId);
			// Only accept the message if the nonce hasn't expired
			validatePayload(!!nonce);
			this.nonce = nonce!;
			// TODO: mark nonce as used

			// Validate the encrypted data
			const authData = getAuthenticationData(
				this.iv,
				this.nonce,
				this.nodeId,
				this.driver.controller.ownNodeId,
				encryptedCC,
			);
			const expectedAuthCode = computeMAC(
				authData,
				this.driver.securityManager.authKey,
			);
			// Only accept messages with a correct auth code
			validatePayload(authCode.equals(expectedAuthCode));

			// Decrypt the encapsulated CC
			const decryptedCC = decryptAES128OFB(
				encryptedCC,
				this.driver.securityManager.encryptionKey,
				Buffer.concat([this.iv, this.nonce]),
			);
			this.encapsulated = CommandClass.from(this.driver, {
				data: decryptedCC,
				fromEncapsulation: true,
				encapCC: this,
			});
		} else {
			if (options.receiverNonce.length !== HALF_NONCE_SIZE) {
				throw new ZWaveError(
					`Nonce must have length ${HALF_NONCE_SIZE}!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.iv = randomBytes(HALF_NONCE_SIZE);
			this.encapsulated = options.encapsulated;
			this.nonce = options.receiverNonce;
			this.nonceId = options.receiverNonceId;
		}
	}

	public readonly iv: Buffer;
	public encapsulated: CommandClass;
	public nonce: Buffer;
	public nonceId: number;

	public serialize(): Buffer {
		const serializedCC = this.encapsulated.serialize();
		// Encrypt the payload
		const iv = Buffer.concat([this.iv, this.nonce]);
		const encryptedCC = encryptAES128OFB(
			serializedCC,
			this.driver.securityManager.encryptionKey,
			iv,
		);
		// And generate the auth code
		const authData = getAuthenticationData(
			this.iv,
			this.nonce,
			this.driver.controller.ownNodeId,
			this.nodeId,
			encryptedCC,
		);
		const authCode = computeMAC(
			authData,
			this.driver.securityManager.authKey,
		);

		this.payload = Buffer.concat([
			this.iv,
			Buffer.from([0]), // TODO: frame control
			encryptedCC,
			Buffer.from([this.nonceId]),
			authCode,
		]);
		return super.serialize();
	}
}

// This is the same message, but with another CC command
@CCCommand(SecurityCommand.CommandEncapsulationNonceGet)
export class SecurityCCCommandEncapsulationNonceGet extends SecurityCCCommandEncapsulation {}

@CCCommand(SecurityCommand.SchemeReport)
export class SecurityCCSchemeReport extends SecurityCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(
			this.payload.length >= 1,
			// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
			(this.payload[0] & 0b1) === 0,
		);
	}
}

@CCCommand(SecurityCommand.SchemeGet)
@expectedCCResponse(SecurityCCSchemeReport)
export class SecurityCCSchemeGet extends SecurityCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		// Don't care, we won't get sent this and we have no options
	}

	public serialize(): Buffer {
		// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
		this.payload = Buffer.from([0]);
		return super.serialize();
	}
}

@CCCommand(SecurityCommand.SchemeInherit)
@expectedCCResponse(SecurityCCSchemeReport)
export class SecurityCCSchemeInherit extends SecurityCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions | CCCommandOptions,
	) {
		super(driver, options);
		// Don't care, we won't get sent this and we have no options
	}

	public serialize(): Buffer {
		// Since it is unlikely that any more schemes will be added to S0, we hardcode the default scheme here (bit 0 = 0)
		this.payload = Buffer.from([0]);
		return super.serialize();
	}
}

@CCCommand(SecurityCommand.NetworkKeyVerify)
export class SecurityCCNetworkKeyVerify extends SecurityCC {}

interface SecurityCCNetworkKeySetOptions extends CCCommandOptions {
	networkKey: Buffer;
}

@CCCommand(SecurityCommand.NetworkKeySet)
@expectedCCResponse(SecurityCCNetworkKeyVerify)
export class SecurityCCNetworkKeySet extends SecurityCC {
	public constructor(
		driver: Driver,
		options:
			| CommandClassDeserializationOptions
			| SecurityCCNetworkKeySetOptions,
	) {
		super(driver, options);
		if (gotDeserializationOptions(options)) {
			// TODO: Deserialize payload
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			if (options.networkKey.length !== 16) {
				throw new ZWaveError(
					`The network key must have length 16!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.networkKey = options.networkKey;
		}
	}

	public networkKey: Buffer;

	public serialize(): Buffer {
		this.payload = this.networkKey;
		return super.serialize();
	}
}

@CCCommand(SecurityCommand.CommandsSupportedReport)
export class SecurityCCCommandsSupportedReport extends SecurityCC {
	public constructor(
		driver: Driver,
		options: CommandClassDeserializationOptions,
	) {
		super(driver, options);
		validatePayload(this.payload.length >= 1);
		this.reportsToFollow = this.payload[0];
		const list = parseCCList(this.payload.slice(1));
		this._supportedCCs = list.supportedCCs;
		this._controlledCCs = list.controlledCCs;
	}

	public readonly reportsToFollow: number;

	public expectMoreMessages(): boolean {
		return this.reportsToFollow > 0;
	}

	private _supportedCCs: CommandClasses[];
	public get supportedCCs(): CommandClasses[] {
		return this._supportedCCs;
	}

	private _controlledCCs: CommandClasses[];
	public get controlledCCs(): CommandClasses[] {
		return this._controlledCCs;
	}

	public mergePartialCCs(
		partials: SecurityCCCommandsSupportedReport[],
	): void {
		// Concat the lists of CCs
		this._supportedCCs = [...partials, this]
			.map((report) => report._supportedCCs)
			.reduce((prev, cur) => prev.concat(...cur), []);
		this._controlledCCs = [...partials, this]
			.map((report) => report._controlledCCs)
			.reduce((prev, cur) => prev.concat(...cur), []);

		// TODO: Persist values
		// this.getValueDB().setValue(
		// 	getMaxNodesValueId(this._groupId),
		// 	this._maxNodes,
		// );
		// this.getValueDB().setValue(
		// 	getNodeIdsValueId(this._groupId),
		// 	this._nodeIds,
		// );
	}
}

@CCCommand(SecurityCommand.CommandsSupportedGet)
@expectedCCResponse(SecurityCCCommandsSupportedReport)
export class SecurityCCCommandsSupportedGet extends SecurityCC {}
