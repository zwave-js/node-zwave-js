import type { Driver } from "../driver/Driver";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { validatePayload } from "../util/misc";
import {
	CCCommand,
	CCCommandOptions,
	CommandClass,
	commandClass,
	CommandClassDeserializationOptions,
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
	NetworkKeySet = 0x06,
	NetworkKeyVerify = 0x07,
	SchemeInherit = 0x08,
	NonceGet = 0x40,
	NonceReport = 0x80,
	CommandEncapsulation = 0x81,
	CommandEncapsulationNonceGet = 0xc1,
}

// TODO: SDS10865: Nonces are identified in the table by their first byte.
// When generating a new nonce, it is ensured that the new nonce does not have a first byte value that is already contained in one of the table entries.
// If the PRNG returns a nonce whose first byte is already contained in the table, then the process is repeated

@commandClass(CommandClasses.Security)
@implementedVersion(1)
export class SecurityCC extends CommandClass {
	declare ccCommand: SecurityCommand;
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
			validatePayload(this.payload.length === 8);
			this.nonce = this.payload;
		} else {
			if (options.nonce.length !== 8) {
				throw new ZWaveError(
					`Nonce must have length 8!`,
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
	iv: Buffer;
	encapsulated: CommandClass;
	nonce: Buffer;
	nonceId: number;
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
			// 8 bytes iv, 1 byte frame control, 2 bytes CC header, 1 byte nonce id, 8 bytes auth code
			validatePayload(this.payload.length >= 8 + 1 + 2 + 1 + 8);
			this.iv = this.payload.slice(0, 8);
			// TODO: frame control
			const encryptedCC = this.payload.slice(9, -9);
			this.nonceId = this.payload[this.payload.length - 9];
			const authCode = this.payload.slice(-8);
			authCode;

			// TODO: read nonce from table
			this.nonce = undefined as any;

			// TODO: decrypt CC data
			this.encapsulated = CommandClass.from(this.driver, {
				data: encryptedCC,
				fromEncapsulation: true,
				encapCC: this,
			});
		} else {
			if (options.iv.length !== 8) {
				throw new ZWaveError(
					`IV must have length 8!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			} else if (options.nonce.length !== 8) {
				throw new ZWaveError(
					`Nonce must have length 8!`,
					ZWaveErrorCodes.Argument_Invalid,
				);
			}

			this.iv = options.iv;
			this.encapsulated = options.encapsulated;
			this.nonce = options.nonce;
			this.nonceId = options.nonceId;
		}
	}

	public iv: Buffer;
	public encapsulated: CommandClass;
	public nonce: Buffer;
	public nonceId: number;

	public serialize(): Buffer {
		const serializedCC = this.encapsulated.serialize();
		// TODO: encrypt and compute auth code
		const authCode = (undefined as any) as Buffer;
		const encryptedCC = (undefined as any) as Buffer;
		serializedCC;

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
