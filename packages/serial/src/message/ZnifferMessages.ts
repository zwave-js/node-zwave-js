import {
	CRC16_CCITT,
	type RSSI,
	type UnknownZWaveChipType,
	ZWaveError,
	ZWaveErrorCodes,
	ZnifferProtocolDataRate,
	getZWaveChipType,
	validatePayload,
} from "@zwave-js/core";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";
import {
	ZnifferFrameType,
	ZnifferFunctionType,
	ZnifferMessageType,
} from "./Constants.js";

export type ZnifferMessageConstructor<T extends ZnifferMessage> =
	& typeof ZnifferMessage
	& {
		new (
			options: ZnifferMessageOptions,
		): T;
	};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ZnifferMessageBaseOptions {
	// Intentionally empty
}

export interface ZnifferMessageOptions extends ZnifferMessageBaseOptions {
	type: ZnifferMessageType;
	functionType?: ZnifferFunctionType;
	payload?: Bytes;
}

export class ZnifferMessageRaw {
	public constructor(
		public readonly type: ZnifferMessageType,
		public readonly functionType: ZnifferFunctionType | undefined,
		public readonly payload: Bytes,
	) {}

	public static parse(data: Uint8Array): ZnifferMessageRaw {
		// Assume that we're dealing with a complete frame
		const type = data[0];
		if (type === ZnifferMessageType.Command) {
			const functionType = data[1];
			const length = data[2];
			const payload = Bytes.view(data.subarray(3, 3 + length));

			return new ZnifferMessageRaw(type, functionType, payload);
		} else if (type === ZnifferMessageType.Data) {
			// The ZnifferParser takes care of segmenting frames, so here we
			// only cut off the type byte from the payload
			const payload = Bytes.view(data.subarray(1));
			return new ZnifferMessageRaw(type, undefined, payload);
		} else {
			throw new ZWaveError(
				`Invalid Zniffer message type ${type as any}`,
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
			);
		}
	}

	public withPayload(payload: Bytes): ZnifferMessageRaw {
		return new ZnifferMessageRaw(this.type, this.functionType, payload);
	}
}

/**
 * Retrieves the correct constructor for the next message in the given Buffer.
 * It is assumed that the buffer has been checked beforehand
 */
function getZnifferMessageConstructor(
	raw: ZnifferMessageRaw,
): ZnifferMessageConstructor<ZnifferMessage> {
	// We hardcode the list of constructors here, since the Zniffer protocol has
	// a very limited list of messages
	if (raw.type === ZnifferMessageType.Command) {
		switch (raw.functionType) {
			case ZnifferFunctionType.GetVersion:
				return ZnifferGetVersionResponse as any;
			case ZnifferFunctionType.SetFrequency:
				return ZnifferSetFrequencyResponse;
			case ZnifferFunctionType.GetFrequencies:
				return ZnifferGetFrequenciesResponse as any;
			case ZnifferFunctionType.Start:
				return ZnifferStartResponse;
			case ZnifferFunctionType.Stop:
				return ZnifferStopResponse;
			case ZnifferFunctionType.SetBaudRate:
				return ZnifferSetBaudRateResponse;
			case ZnifferFunctionType.GetFrequencyInfo:
				return ZnifferGetFrequencyInfoResponse as any;
			default:
				return ZnifferMessage;
		}
	} else if (raw.type === ZnifferMessageType.Data) {
		return ZnifferDataMessage as any;
	} else {
		return ZnifferMessage;
	}
}

/**
 * Represents a Zniffer message for communication with the serial interface
 */
export class ZnifferMessage {
	public constructor(
		options: ZnifferMessageOptions,
	) {
		this.type = options.type;
		this.functionType = options.functionType;
		this.payload = options.payload || new Bytes();
	}

	public static parse(
		data: Uint8Array,
	): ZnifferMessage {
		const raw = ZnifferMessageRaw.parse(data);
		const Constructor = getZnifferMessageConstructor(raw);
		return Constructor.from(raw);
	}

	/** Creates an instance of the message that is serialized in the given buffer */
	public static from(raw: ZnifferMessageRaw): ZnifferMessage {
		return new this({
			type: raw.type,
			functionType: raw.functionType,
			payload: raw.payload,
		});
	}

	public type: ZnifferMessageType;
	public functionType?: ZnifferFunctionType;
	public payload: Bytes;

	/** Serializes this message into a Buffer */
	public serialize(): Bytes {
		if (this.type === ZnifferMessageType.Command) {
			return Bytes.concat([
				Bytes.from([
					this.type,
					this.functionType!,
					this.payload.length,
				]),
				this.payload,
			]);
		} else if (this.type === ZnifferMessageType.Data) {
			const ret = Bytes.concat([
				[this.type],
				this.payload,
			]);
			ret[9] = this.payload.length - 10;
			// FIXME: Is this correct? It used to be
			// const ret = new Bytes(this.payload.length + 1);
			// ret[0] = this.type;
			// this.payload.copy(ret, 1);
			// this.payload[9] = this.payload.length - 10;
			return ret;
		} else {
			throw new ZWaveError(
				`Invalid Zniffer message type ${this.type as any}`,
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
			);
		}
	}
}

function computeChecksumXOR(buffer: Uint8Array): number {
	let ret = 0xff;
	for (let i = 0; i < buffer.length; i++) {
		ret ^= buffer[i];
	}
	return ret;
}

export interface ZnifferFrameInfo {
	readonly frameType: ZnifferFrameType;
	readonly channel: number;
	readonly protocolDataRate: ZnifferProtocolDataRate;
	readonly region: number;
	readonly rssiRaw: number;
	rssi?: RSSI;
}

export interface ZnifferDataMessageOptions {
	frameType: ZnifferFrameType;
	channel: number;
	protocolDataRate: ZnifferProtocolDataRate;
	region: number;
	rssiRaw: number;
	payload: Bytes;
	checksumOK: boolean;
}

export class ZnifferDataMessage extends ZnifferMessage
	implements ZnifferFrameInfo
{
	public constructor(
		options: ZnifferDataMessageOptions & ZnifferMessageBaseOptions,
	) {
		super({
			type: ZnifferMessageType.Data,
			payload: options.payload,
		});

		this.frameType = options.frameType;
		this.channel = options.channel;
		this.protocolDataRate = options.protocolDataRate;
		this.region = options.region;
		this.rssiRaw = options.rssiRaw;
		this.checksumOK = options.checksumOK;
	}

	public static from(raw: ZnifferMessageRaw): ZnifferDataMessage {
		const frameType: ZnifferFrameType = raw.payload[0];

		// bytes 1-2 are 0
		const channel = raw.payload[3] >>> 5;
		const protocolDataRate: ZnifferProtocolDataRate = raw.payload[3]
			& 0b11111;
		const checksumLength =
			protocolDataRate >= ZnifferProtocolDataRate.ZWave_100k
				? 2
				: 1;
		const region = raw.payload[4];
		const rssiRaw = raw.payload[5];
		let checksumOK: boolean;
		let payload: Bytes;

		if (frameType === ZnifferFrameType.Data) {
			validatePayload.withReason(
				`ZnifferDataMessage[6] = ${raw.payload[6]}`,
			)(raw.payload[6] === 0x21);
			validatePayload.withReason(
				`ZnifferDataMessage[7] = ${raw.payload[7]}`,
			)(raw.payload[7] === 0x03);
			// Length is already validated, so we just skip the length byte

			const mpduOffset = 9;
			const checksum = raw.payload.readUIntBE(
				raw.payload.length - checksumLength,
				checksumLength,
			);

			// Compute checksum over the entire MPDU
			const expectedChecksum = checksumLength === 1
				? computeChecksumXOR(
					raw.payload.subarray(mpduOffset, -checksumLength),
				)
				: CRC16_CCITT(
					raw.payload.subarray(mpduOffset, -checksumLength),
				);

			checksumOK = checksum === expectedChecksum;
			payload = raw.payload.subarray(
				mpduOffset,
				-checksumLength,
			);
		} else if (
			frameType === ZnifferFrameType.BeamStart
		) {
			validatePayload.withReason(
				`ZnifferDataMessage[6] = ${raw.payload[6]}`,
			)(raw.payload[6] === 0x55);

			// There is no checksum
			checksumOK = true;
			payload = raw.payload.subarray(6);
		} else if (frameType === ZnifferFrameType.BeamStop) {
			// This always seems to contain the same 2 bytes
			// There is no checksum
			checksumOK = true;
			payload = new Bytes();
		} else {
			validatePayload.fail(
				`Unsupported frame type ${
					getEnumMemberName(ZnifferFrameType, frameType)
				}`,
			);
		}

		return new this({
			frameType,
			channel,
			protocolDataRate,
			region,
			rssiRaw,
			payload,
			checksumOK,
		});
	}

	public readonly frameType: ZnifferFrameType;
	public readonly channel: number;
	public readonly protocolDataRate: ZnifferProtocolDataRate;
	public readonly region: number;
	public readonly rssiRaw: number;

	public readonly checksumOK: boolean;
}

export class ZnifferGetVersionRequest extends ZnifferMessage {
	public constructor() {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetVersion,
		});
	}
}

export interface ZnifferGetVersionResponseOptions {
	chipType: string | UnknownZWaveChipType;
	majorVersion: number;
	minorVersion: number;
}

export class ZnifferGetVersionResponse extends ZnifferMessage {
	public constructor(
		options: ZnifferGetVersionResponseOptions & ZnifferMessageBaseOptions,
	) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetVersion,
		});

		this.chipType = options.chipType;
		this.majorVersion = options.majorVersion;
		this.minorVersion = options.minorVersion;
	}

	public static from(raw: ZnifferMessageRaw): ZnifferGetVersionResponse {
		const chipType: string | UnknownZWaveChipType = getZWaveChipType(
			raw.payload[0],
			raw.payload[1],
		);
		const majorVersion = raw.payload[2];
		const minorVersion = raw.payload[3];

		return new this({
			chipType,
			majorVersion,
			minorVersion,
		});
	}

	public readonly chipType: string | UnknownZWaveChipType;
	public readonly majorVersion: number;
	public readonly minorVersion: number;
}

export interface ZnifferSetFrequencyRequestOptions {
	frequency: number;
}

export class ZnifferSetFrequencyRequest extends ZnifferMessage {
	public constructor(options: ZnifferSetFrequencyRequestOptions) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.SetFrequency,
		});

		this.frequency = options.frequency;
	}

	public frequency: number;

	public serialize(): Bytes {
		this.payload = Bytes.from([this.frequency]);
		return super.serialize();
	}
}
export class ZnifferSetFrequencyResponse extends ZnifferMessage {
	// No payload
}

export class ZnifferGetFrequenciesRequest extends ZnifferMessage {
	public constructor() {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencies,
		});
	}
}

export interface ZnifferGetFrequenciesResponseOptions {
	currentFrequency: number;
	supportedFrequencies: number[];
}

export class ZnifferGetFrequenciesResponse extends ZnifferMessage {
	public constructor(
		options:
			& ZnifferGetFrequenciesResponseOptions
			& ZnifferMessageBaseOptions,
	) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencies,
		});

		this.currentFrequency = options.currentFrequency;
		this.supportedFrequencies = options.supportedFrequencies;
	}

	public static from(raw: ZnifferMessageRaw): ZnifferGetFrequenciesResponse {
		const currentFrequency = raw.payload[0];
		const supportedFrequencies = [
			...raw.payload.subarray(1),
		];

		return new this({
			currentFrequency,
			supportedFrequencies,
		});
	}

	public readonly currentFrequency: number;
	public readonly supportedFrequencies: readonly number[];
}

export class ZnifferStartRequest extends ZnifferMessage {
	public constructor() {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.Start,
		});
	}
}
export class ZnifferStartResponse extends ZnifferMessage {
	// No payload
}

export class ZnifferStopRequest extends ZnifferMessage {
	public constructor() {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.Stop,
		});
	}
}
export class ZnifferStopResponse extends ZnifferMessage {
	// No payload
}

export interface ZnifferSetBaudRateRequestOptions {
	// No clue - the open source firmware only accepts 0
	baudrate: 0;
}

export class ZnifferSetBaudRateRequest extends ZnifferMessage {
	public constructor(options: ZnifferSetBaudRateRequestOptions) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.SetBaudRate,
		});

		this.baudrate = options.baudrate;
	}

	public baudrate: 0;

	public serialize(): Bytes {
		this.payload = Bytes.from([this.baudrate]);
		return super.serialize();
	}
}
export class ZnifferSetBaudRateResponse extends ZnifferMessage {
	// No payload
}

export interface ZnifferGetFrequencyInfoRequestOptions {
	frequency: number;
}

export class ZnifferGetFrequencyInfoRequest extends ZnifferMessage {
	public constructor(options: ZnifferGetFrequencyInfoRequestOptions) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencyInfo,
		});

		this.frequency = options.frequency;
	}

	public frequency: number;

	public serialize(): Bytes {
		this.payload = Bytes.from([this.frequency]);
		return super.serialize();
	}
}

export interface ZnifferGetFrequencyInfoResponseOptions {
	frequency: number;
	numChannels: number;
	frequencyName: string;
}

export class ZnifferGetFrequencyInfoResponse extends ZnifferMessage {
	public constructor(
		options:
			& ZnifferGetFrequencyInfoResponseOptions
			& ZnifferMessageBaseOptions,
	) {
		super({
			type: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencyInfo,
		});

		this.frequency = options.frequency;
		this.numChannels = options.numChannels;
		this.frequencyName = options.frequencyName;
	}

	public static from(
		raw: ZnifferMessageRaw,
	): ZnifferGetFrequencyInfoResponse {
		const frequency = raw.payload[0];
		const numChannels = raw.payload[1];
		const frequencyName: string = raw.payload
			.subarray(2)
			.toString("ascii");

		return new this({
			frequency,
			numChannels,
			frequencyName,
		});
	}

	public readonly frequency: number;
	public readonly numChannels: number;
	public readonly frequencyName: string;
}
