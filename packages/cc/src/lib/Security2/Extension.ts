import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import {
	ZWaveError,
	ZWaveErrorCodes,
	validatePayload,
} from "@zwave-js/core/safe";
import { Bytes, buffer2hex, getEnumMemberName } from "@zwave-js/shared/safe";

enum S2ExtensionType {
	SPAN = 0x01,
	MPAN = 0x02,
	MGRP = 0x03,
	MOS = 0x04,
}

const extensionTypeDecorator = createSimpleReflectionDecorator<
	typeof Security2Extension,
	[type: S2ExtensionType],
	Security2ExtensionConstructor<Security2Extension>
>({
	name: "extensionType",
});

/** Defines which S2 extension type a subclass of S2Extension has */
export const extensionType = extensionTypeDecorator.decorator;

/** Returns which S2 extension type a subclass of S2Extension has */
export const getExtensionType = extensionTypeDecorator.lookupValue;

/**
 * Looks up the S2 extension constructor for a given S2 extension type
 */
export const getS2ExtensionConstructor =
	extensionTypeDecorator.lookupConstructor;

export type Security2ExtensionConstructor<T extends Security2Extension> =
	& typeof Security2Extension
	& {
		new (options: Security2ExtensionOptions): T;
	};

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

export class Security2ExtensionRaw {
	public constructor(
		public type: S2ExtensionType,
		public critical: boolean,
		public readonly moreToFollow: boolean,
		public payload: Uint8Array,
	) {}

	public static parse(data: Uint8Array): Security2ExtensionRaw {
		validatePayload(data.length >= 2);
		const totalLength = data[0];
		const moreToFollow = !!(data[1] & 0b1000_0000);
		const critical = !!(data[1] & 0b0100_0000);
		const type = data[1] & 0b11_1111;
		const payload = data.subarray(2, totalLength);

		return new Security2ExtensionRaw(type, critical, moreToFollow, payload);
	}

	public withPayload(payload: Bytes): Security2ExtensionRaw {
		return new Security2ExtensionRaw(
			this.type,
			this.critical,
			this.moreToFollow,
			payload,
		);
	}
}

interface Security2ExtensionBaseOptions {
	critical?: boolean;
	moreToFollow?: boolean;
}

interface Security2ExtensionOptions extends Security2ExtensionBaseOptions {
	type?: S2ExtensionType;
	payload?: Uint8Array;
}

export class Security2Extension {
	public constructor(options: Security2ExtensionOptions) {
		const {
			// Try to determine the extension type if none is given
			type = getExtensionType(this),
			critical = false,
			moreToFollow = false,
			payload = new Uint8Array(),
		} = options;

		if (type == undefined) {
			throw new ZWaveError(
				"A Security2Extension must have a given or predefined extension type",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.type = type;
		this.critical = critical;
		this.moreToFollow = moreToFollow;
		this.payload = payload;
	}

	public static parse(
		data: Uint8Array,
	): Security2Extension {
		const raw = Security2ExtensionRaw.parse(data);
		const Constructor = getS2ExtensionConstructor(raw.type)
			?? Security2Extension;
		return Constructor.from(raw);
	}

	/** Creates an instance of the message that is serialized in the given buffer */
	public static from(
		raw: Security2ExtensionRaw,
	): Security2Extension {
		return new this({
			type: raw.type,
			critical: raw.critical,
			moreToFollow: raw.moreToFollow,
			payload: raw.payload,
		});
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
		options: SPANExtensionOptions & Security2ExtensionBaseOptions,
	) {
		if (options.senderEI.length !== 16) {
			throw new ZWaveError(
				"The sender's entropy must be a 16-byte buffer!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		super({ critical: true, ...options });
		this.senderEI = options.senderEI;
	}

	public static from(raw: Security2ExtensionRaw): Security2Extension {
		validatePayload(raw.payload.length === 16);
		const senderEI = raw.payload;

		return new SPANExtension({
			critical: raw.critical,
			moreToFollow: raw.moreToFollow,
			senderEI,
		});
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
		options: MPANExtensionOptions & Security2ExtensionBaseOptions,
	) {
		if (options.innerMPANState.length !== 16) {
			throw new ZWaveError(
				"The inner MPAN state must be a 16-byte buffer!",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}
		super({ critical: true, ...options });
		this.groupId = options.groupId;
		this.innerMPANState = options.innerMPANState;
	}

	public static from(raw: Security2ExtensionRaw): Security2Extension {
		validatePayload(raw.payload.length === 17);
		const groupId = raw.payload[0];
		const innerMPANState = raw.payload.subarray(1);

		return new MPANExtension({
			critical: raw.critical,
			moreToFollow: raw.moreToFollow,
			groupId,
			innerMPANState,
		});
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
		options: MGRPExtensionOptions & Security2ExtensionBaseOptions,
	) {
		super({ critical: true, ...options });
		this.groupId = options.groupId;
	}

	public static from(raw: Security2ExtensionRaw): Security2Extension {
		validatePayload(raw.payload.length === 1);
		const groupId = raw.payload[0];

		return new MGRPExtension({
			critical: raw.critical,
			moreToFollow: raw.moreToFollow,
			groupId,
		});
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
	public constructor(options: Security2ExtensionBaseOptions = {}) {
		super({ critical: false, ...options });
	}

	public static readonly expectedLength = 2;
}
