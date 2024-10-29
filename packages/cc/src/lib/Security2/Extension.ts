import {
	ZWaveError,
	ZWaveErrorCodes,
	isZWaveError,
	validatePayload,
} from "@zwave-js/core/safe";
import {
	Bytes,
	type TypedClassDecorator,
	buffer2hex,
	getEnumMemberName,
	isUint8Array,
} from "@zwave-js/shared/safe";
import "reflect-metadata";

enum S2ExtensionType {
	SPAN = 0x01,
	MPAN = 0x02,
	MGRP = 0x03,
	MOS = 0x04,
}

const METADATA_S2ExtensionMap = Symbol("S2ExtensionMap");
const METADATA_S2Extension = Symbol("S2Extension");

type S2ExtensionMap = Map<
	S2ExtensionType,
	Security2ExtensionConstructor<Security2Extension>
>;

export type Security2ExtensionConstructor<T extends Security2Extension> =
	& typeof Security2Extension
	& {
		new (options: Security2ExtensionOptions): T;
	};

/**
 * Looks up the S2 extension constructor for a given S2 extension type
 */
export function getS2ExtensionConstructor(
	type: S2ExtensionType,
): Security2ExtensionConstructor<Security2Extension> | undefined {
	// Retrieve the constructor map from the CommandClass class
	const map = Reflect.getMetadata(
		METADATA_S2ExtensionMap,
		Security2Extension,
	) as S2ExtensionMap | undefined;
	return map?.get(type);
}

/**
 * Defines the command class associated with a Z-Wave message
 */
export function extensionType(
	type: S2ExtensionType,
): TypedClassDecorator<Security2Extension> {
	return (extensionClass) => {
		Reflect.defineMetadata(METADATA_S2Extension, type, extensionClass);

		const map: S2ExtensionMap =
			Reflect.getMetadata(METADATA_S2ExtensionMap, Security2Extension)
			|| new Map();
		map.set(
			type,
			extensionClass as unknown as Security2ExtensionConstructor<
				Security2Extension
			>,
		);
		Reflect.defineMetadata(
			METADATA_S2ExtensionMap,
			map,
			Security2Extension,
		);
	};
}

/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export function getExtensionType<T extends Security2Extension>(
	ext: T,
): S2ExtensionType {
	// get the class constructor
	const constr = ext.constructor;
	// retrieve the current metadata
	const ret: S2ExtensionType | undefined = Reflect.getMetadata(
		METADATA_S2Extension,
		constr,
	);
	if (ret == undefined) {
		throw new ZWaveError(
			`No S2 extension type defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

export enum ValidateS2ExtensionResult {
	OK,
	DiscardExtension,
	DiscardCommand,
}

/** Tests if the extension may be accepted */
export function validateS2Extension(
	ext: Security2Extension,
	wasEncrypted: boolean,
): ValidateS2ExtensionResult {
	if (ext instanceof InvalidExtension) {
		// The extension could not be parsed, ignore it
		return ValidateS2ExtensionResult.DiscardExtension;
	}

	if (ext.critical && !(ext.type in S2ExtensionType)) {
		// A receiving node MUST discard the entire command if the Critical flag
		// is set to ‘1’ and the Type field advertises a value that the
		// receiving node does not support.
		return ValidateS2ExtensionResult.DiscardCommand;
	}

	// Check if the extension is correctly encrypted or not encrypted
	switch (ext.type) {
		case S2ExtensionType.MPAN:
			if (!wasEncrypted) {
				return ValidateS2ExtensionResult.DiscardExtension;
			}
			break;
		case S2ExtensionType.SPAN:
		case S2ExtensionType.MGRP:
		case S2ExtensionType.MOS:
			if (wasEncrypted) {
				return ValidateS2ExtensionResult.DiscardExtension;
			}
			break;
	}

	return ValidateS2ExtensionResult.OK;
}

interface Security2ExtensionCreationOptions {
	critical: boolean;
	payload?: Uint8Array;
}

interface Security2ExtensionDeserializationOptions {
	data: Uint8Array;
}

type Security2ExtensionOptions =
	| Security2ExtensionCreationOptions
	| Security2ExtensionDeserializationOptions;

function gotDeserializationOptions(
	options: Record<string, any>,
): options is Security2ExtensionDeserializationOptions {
	return "data" in options && isUint8Array(options.data);
}

export class Security2Extension {
	public constructor(options: Security2ExtensionOptions) {
		if (gotDeserializationOptions(options)) {
			validatePayload(options.data.length >= 2);
			const totalLength = options.data[0];
			const controlByte = options.data[1];
			this.moreToFollow = !!(controlByte & 0b1000_0000);
			this.critical = !!(controlByte & 0b0100_0000);
			this.type = controlByte & 0b11_1111;
			this.payload = options.data.subarray(2, totalLength);
		} else {
			this.type = getExtensionType(this);
			this.critical = options.critical;
			this.payload = options.payload ?? new Uint8Array();
		}
	}

	public type: S2ExtensionType;
	public critical: boolean;
	public readonly moreToFollow?: boolean;
	public payload: Uint8Array;

	public isEncrypted(): boolean {
		return false;
	}

	public serialize(moreToFollow: boolean): Bytes {
		return Bytes.concat([
			Bytes.from([
				2 + this.payload.length,
				(moreToFollow ? 0b1000_0000 : 0)
				| (this.critical ? 0b0100_0000 : 0)
				| (this.type & 0b11_1111),
			]),
			this.payload,
		]);
	}

	/** Returns the number of bytes the first extension in the buffer occupies */
	public static getExtensionLength(
		data: Uint8Array,
	): { expected?: number; actual: number } {
		const actual = data[0];
		let expected: number | undefined;

		// For known extensions, return the expected length
		const type = data[1] & 0b11_1111;
		switch (type) {
			case S2ExtensionType.SPAN:
				expected = SPANExtension.expectedLength;
				break;
			case S2ExtensionType.MPAN:
				expected = MPANExtension.expectedLength;
				break;
			case S2ExtensionType.MGRP:
				expected = MGRPExtension.expectedLength;
				break;
			case S2ExtensionType.MOS:
				expected = MOSExtension.expectedLength;
				break;
		}

		return { expected, actual };
	}

	/** Returns the number of bytes the serialized extension will occupy */
	public computeLength(): number {
		return 2 + this.payload.length;
	}

	/**
	 * Retrieves the correct constructor for the next extension in the given Buffer.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static getConstructor(
		data: Uint8Array,
	): Security2ExtensionConstructor<Security2Extension> {
		const type = data[1] & 0b11_1111;
		return getS2ExtensionConstructor(type) ?? Security2Extension;
	}

	/** Creates an instance of the S2 extension that is serialized in the given buffer */
	public static from(data: Uint8Array): Security2Extension {
		const Constructor = Security2Extension.getConstructor(data);
		try {
			const ret = new Constructor({ data });
			return ret;
		} catch (e) {
			if (
				isZWaveError(e)
				&& e.code === ZWaveErrorCodes.PacketFormat_InvalidPayload
			) {
				return new InvalidExtension({ data });
			}
			throw e;
		}
	}

	public toLogEntry(): string {
		let ret = `
· type: ${getEnumMemberName(S2ExtensionType, this.type)}`;
		if (this.payload.length > 0) {
			ret += `
  payload: ${buffer2hex(this.payload)}`;
		}
		return ret;
	}
}

export class InvalidExtension extends Security2Extension {
}

interface SPANExtensionOptions {
	senderEI: Uint8Array;
}

@extensionType(S2ExtensionType.SPAN)
export class SPANExtension extends Security2Extension {
	public constructor(
		options:
			| Security2ExtensionDeserializationOptions
			| SPANExtensionOptions,
	) {
		if (gotDeserializationOptions(options)) {
			super(options);
			validatePayload(this.payload.length === 16);
			this.senderEI = this.payload;
		} else {
			super({ critical: true });
			if (options.senderEI.length !== 16) {
				throw new ZWaveError(
					"The sender's entropy must be a 16-byte buffer!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			this.senderEI = options.senderEI;
		}
	}

	public senderEI: Uint8Array;

	public static readonly expectedLength = 18;

	public serialize(moreToFollow: boolean): Bytes {
		this.payload = this.senderEI;
		return super.serialize(moreToFollow);
	}

	public toLogEntry(): string {
		let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
		ret += `  sender EI: ${buffer2hex(this.senderEI)}`;
		return ret;
	}
}

interface MPANExtensionOptions {
	groupId: number;
	innerMPANState: Uint8Array;
}

@extensionType(S2ExtensionType.MPAN)
export class MPANExtension extends Security2Extension {
	public constructor(
		options:
			| Security2ExtensionDeserializationOptions
			| MPANExtensionOptions,
	) {
		if (gotDeserializationOptions(options)) {
			super(options);
			validatePayload(this.payload.length === 17);
			this.groupId = this.payload[0];
			this.innerMPANState = this.payload.subarray(1);
		} else {
			if (options.innerMPANState.length !== 16) {
				throw new ZWaveError(
					"The inner MPAN state must be a 16-byte buffer!",
					ZWaveErrorCodes.Argument_Invalid,
				);
			}
			super({ critical: true });
			this.groupId = options.groupId;
			this.innerMPANState = options.innerMPANState;
		}
	}

	public groupId: number;
	public innerMPANState: Uint8Array;

	public isEncrypted(): boolean {
		return true;
	}

	public static readonly expectedLength = 19;

	public serialize(moreToFollow: boolean): Bytes {
		this.payload = Bytes.concat([
			[this.groupId],
			this.innerMPANState,
		]);
		return super.serialize(moreToFollow);
	}

	public toLogEntry(): string {
		const mpanState = process.env.NODE_ENV === "test"
				|| process.env.NODE_ENV === "development"
			? buffer2hex(this.innerMPANState)
			: "(hidden)";
		let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
		ret += `  group ID: ${this.groupId}
  MPAN state: ${mpanState}`;
		return ret;
	}
}

interface MGRPExtensionOptions {
	groupId: number;
}

@extensionType(S2ExtensionType.MGRP)
export class MGRPExtension extends Security2Extension {
	public constructor(
		options:
			| Security2ExtensionDeserializationOptions
			| MGRPExtensionOptions,
	) {
		if (gotDeserializationOptions(options)) {
			super(options);
			validatePayload(this.payload.length === 1);
			this.groupId = this.payload[0];
		} else {
			super({ critical: true });
			this.groupId = options.groupId;
		}
	}

	public groupId: number;

	public static readonly expectedLength = 3;

	public serialize(moreToFollow: boolean): Bytes {
		this.payload = Bytes.from([this.groupId]);
		return super.serialize(moreToFollow);
	}

	public toLogEntry(): string {
		let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
		ret += `  group ID: ${this.groupId}`;
		return ret;
	}
}

@extensionType(S2ExtensionType.MOS)
export class MOSExtension extends Security2Extension {
	public constructor(options?: Security2ExtensionDeserializationOptions) {
		if (options && gotDeserializationOptions(options)) {
			super(options);
		} else {
			super({ critical: false });
		}
	}

	public static readonly expectedLength = 2;
}
