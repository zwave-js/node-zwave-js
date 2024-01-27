import {
	type BeamingInfo,
	CRC16_CCITT,
	type MPDUHeaderType,
	type UnknownZWaveChipType,
	ZWaveError,
	ZWaveErrorCodes,
	ZnifferProtocolDataRate,
	ZnifferRegion,
	getZWaveChipType,
	validatePayload,
} from "@zwave-js/core";
import {
	type ZnifferFrameType,
	ZnifferFunctionType,
	ZnifferMessageType,
} from "./Constants";

export type ZnifferMessageConstructor<T extends ZnifferMessage> = new (
	options: ZnifferMessageOptions,
) => T;

export type DeserializingZnifferMessageConstructor<T extends ZnifferMessage> =
	new (
		options: ZnifferMessageDeserializationOptions,
	) => T;

export interface ZnifferMessageDeserializationOptions {
	data: Buffer;
}

/**
 * Tests whether the given message constructor options contain a buffer for deserialization
 */
function gotDeserializationOptions(
	options: Record<any, any> | undefined,
): options is ZnifferMessageDeserializationOptions {
	return options != undefined && Buffer.isBuffer(options.data);
}

export interface ZnifferMessageBaseOptions {
	// Intentionally empty
}

export interface ZnifferMessageCreationOptions
	extends ZnifferMessageBaseOptions
{
	messageType: ZnifferMessageType;
	functionType?: ZnifferFunctionType;
	payload?: Buffer;
}

export type ZnifferMessageOptions =
	| ZnifferMessageCreationOptions
	| ZnifferMessageDeserializationOptions;

/**
 * Represents a Zniffer message for communication with the serial interface
 */
export class ZnifferMessage {
	public constructor(
		// public readonly host: ZWaveHost,
		options: ZnifferMessageOptions,
	) {
		// decide which implementation we follow
		if (gotDeserializationOptions(options)) {
			// #1: deserialize from payload
			const payload = options.data;

			// Assume that we're dealing with a complete frame
			this.type = payload[0];
			if (this.type === ZnifferMessageType.Command) {
				this.functionType = payload[1];
				const length = payload[2];
				this.payload = payload.subarray(3, 3 + length);
			} else if (this.type === ZnifferMessageType.Data) {
				// TODO: Having the header etc. be part of the payload is a bit awkward
				const length = payload[9];
				this.payload = payload.subarray(1, 10 + length);
			} else {
				throw new ZWaveError(
					`Invalid Zniffer message type ${this.type as any}`,
					ZWaveErrorCodes.PacketFormat_InvalidPayload,
				);
			}
		} else {
			this.type = options.messageType;
			this.functionType = options.functionType;
			this.payload = options.payload || Buffer.allocUnsafe(0);
		}
	}

	public type: ZnifferMessageType;
	public functionType?: ZnifferFunctionType;
	public payload: Buffer; // TODO: Length limit 255

	/** Serializes this message into a Buffer */
	public serialize(): Buffer {
		if (this.type === ZnifferMessageType.Command) {
			return Buffer.concat([
				Buffer.from([
					this.type,
					this.functionType!,
					this.payload.length,
				]),
				this.payload,
			]);
		} else if (this.type === ZnifferMessageType.Data) {
			const ret = Buffer.allocUnsafe(this.payload.length + 1);
			ret[0] = this.type;
			this.payload.copy(ret, 1);
			this.payload[9] = this.payload.length - 10;
			return ret;
		} else {
			throw new ZWaveError(
				`Invalid Zniffer message type ${this.type as any}`,
				ZWaveErrorCodes.PacketFormat_InvalidPayload,
			);
		}
	}

	/**
	 * Retrieves the correct constructor for the next message in the given Buffer.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static getConstructor(
		data: Buffer,
	): ZnifferMessageConstructor<ZnifferMessage> {
		const type = data[0];
		// We hardcode the list of constructors here, since the Zniffer protocol has
		// a very limited list of messages
		if (type === ZnifferMessageType.Command) {
			const functionType = data[1];
			switch (functionType) {
				case ZnifferFunctionType.GetVersion:
					return ZnifferGetVersionResponse;
				case ZnifferFunctionType.SetFrequency:
					return ZnifferSetFrequencyResponse;
				case ZnifferFunctionType.GetFrequencies:
					return ZnifferGetFrequenciesResponse;
				case ZnifferFunctionType.Start:
					return ZnifferStartResponse;
				case ZnifferFunctionType.Stop:
					return ZnifferStopResponse;
				case ZnifferFunctionType.SetBaudRate:
					return ZnifferSetBaudRateResponse;
				case ZnifferFunctionType.GetFrequencyInfo:
					return ZnifferGetFrequencyInfoResponse;
				default:
					return ZnifferMessage;
			}
		} else if (type === ZnifferMessageType.Data) {
			return ZnifferDataMessage;
		} else {
			return ZnifferMessage;
		}
	}

	/** Creates an instance of the message that is serialized in the given buffer */
	public static from(
		options: ZnifferMessageDeserializationOptions,
	): ZnifferMessage {
		const Constructor = ZnifferMessage.getConstructor(options.data);
		const ret = new Constructor(options);
		return ret;
	}

	// /** Generates a representation of this Message for the log */
	// public toLogEntry(): MessageOrCCLogEntry {
	// 	const tags = [
	// 		this.type === MessageType.Request ? "REQ" : "RES",
	// 		FunctionType[this.functionType],
	// 	];
	// 	const nodeId = this.getNodeId();
	// 	if (nodeId) tags.unshift(getNodeTag(nodeId));

	// 	return {
	// 		tags,
	// 		message: this.payload.length > 0
	// 			? { payload: `0x${this.payload.toString("hex")}` }
	// 			: undefined,
	// 	};
	// }
}

function computeChecksumXOR(buffer: Buffer): number {
	let ret = 0xff;
	for (let i = 0; i < buffer.length; i++) {
		ret ^= buffer[i];
	}
	return ret;
}

function getChannelConfiguration(region: ZnifferRegion): "1/2" | "3" | "4" {
	switch (region) {
		case ZnifferRegion.Japan:
		case ZnifferRegion.Korea:
			return "3";
		case ZnifferRegion["USA (Long Range)"]:
		case ZnifferRegion["USA (Long Range, backup)"]:
		case ZnifferRegion["USA (Long Range, end device)"]:
			return "4";
		default:
			return "1/2";
	}
}

export class ZnifferDataMessage extends ZnifferMessage {
	public constructor(options: ZnifferMessageOptions) {
		super(options);

		if (gotDeserializationOptions(options)) {
			// FIXME: Find out which differences channel configuration 4 (ZWLR) has
			// FIXME: Multicast has a bitmask instead of a destination node ID

			this.frameType = this.payload[0];
			// bytes 1-2 are 0
			this.channel = this.payload[3] >>> 5;
			this.protocolDataRate = this.payload[3] & 0b11111;
			const checksumLength =
				this.protocolDataRate >= ZnifferProtocolDataRate.ZWave_100k
					? 2
					: 1;
			this.region = this.payload[4];
			const channelConfig = getChannelConfiguration(this.region);
			this.rssiRaw = this.payload[5];

			validatePayload(this.payload[6] === 0x21);
			validatePayload(this.payload[7] === 0x03);
			// Length is already validated, so we just skip the length byte

			const homeIdOffset = 9;
			this.homeId = this.payload.readUInt32BE(homeIdOffset);
			this.sourceNodeId = this.payload[13];
			let destinationOffset = 17;
			const frameControl = this.payload.subarray(14, 16);
			switch (channelConfig) {
				case "1/2": {
					this.routed = !!(frameControl[0] & 0b1000_0000);
					this.ackRequested = !!(frameControl[0] & 0b0100_0000);
					this.lowPower = !!(frameControl[0] & 0b0010_0000);
					this.speedModified = !!(frameControl[0] & 0b0001_0000);
					this.headerType = frameControl[0] & 0b0000_1111;
					this.beamingInfo = frameControl[1] & 0b0110_0000;
					this.sequenceNumber = frameControl[1] & 0b0000_1111;
					break;
				}
				case "3": {
					this.routed = false;
					this.ackRequested = !!(frameControl[0] & 0b1000_0000);
					this.lowPower = !!(frameControl[0] & 0b0100_0000);
					this.speedModified = false;
					this.headerType = frameControl[0] & 0b0000_1111;
					this.beamingInfo = frameControl[1] & 0b0111_0000;
					this.sequenceNumber = this.payload[destinationOffset];
					destinationOffset++;
					break;
				}
				default: {
					validatePayload.fail(
						`Unsupported channel configuration ${channelConfig}`,
					);
				}
			}
			// another length byte we just skip
			this.destinationNodeId = this.payload[destinationOffset];
			this.data = this.payload.subarray(
				destinationOffset + 1,
				this.payload.length - checksumLength,
			);
			this.checksum = this.payload.readUIntBE(
				this.payload.length - checksumLength,
				checksumLength,
			);

			// Compute checksum from HOMEID to start of checksum
			const expectedChecksum = checksumLength === 1
				? computeChecksumXOR(
					this.payload.subarray(homeIdOffset, -checksumLength),
				)
				: CRC16_CCITT(
					this.payload.subarray(homeIdOffset, -checksumLength),
				);
			if (this.checksum !== expectedChecksum) {
				throw new ZWaveError(
					"CRC error",
					ZWaveErrorCodes.PacketFormat_Checksum,
				);
			}
		} else {
			throw new ZWaveError(
				`Sending ${this.constructor.name} is not supported!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
	}

	public readonly frameType: ZnifferFrameType;
	public readonly channel: number;
	public readonly protocolDataRate: ZnifferProtocolDataRate;
	public readonly region: ZnifferRegion;
	public readonly rssiRaw: number;
	public readonly homeId: number;
	public readonly sourceNodeId: number;

	// Frame control:
	public readonly routed: boolean;
	public readonly ackRequested: boolean;
	public readonly lowPower: boolean;
	public readonly speedModified: boolean;
	public readonly headerType: MPDUHeaderType;
	public readonly beamingInfo: BeamingInfo;
	public readonly sequenceNumber: number;

	public readonly destinationNodeId: number;
	public readonly data: Buffer;
	public readonly checksum: number;
}

export class ZnifferGetVersionRequest extends ZnifferMessage {
	public constructor() {
		super({
			messageType: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetVersion,
		});
	}
}

export class ZnifferGetVersionResponse extends ZnifferMessage {
	public constructor(options: ZnifferMessageOptions) {
		super(options);

		if (gotDeserializationOptions(options)) {
			this.chipType = getZWaveChipType(this.payload[0], this.payload[1]);
			this.majorVersion = this.payload[2];
			this.minorVersion = this.payload[3];
		} else {
			throw new ZWaveError(
				`Sending ${this.constructor.name} is not supported!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
	}

	public readonly chipType: string | UnknownZWaveChipType;
	public readonly majorVersion: number;
	public readonly minorVersion: number;
}

export interface ZnifferSetFrequencyRequestOptions {
	frequency: ZnifferRegion;
}

export class ZnifferSetFrequencyRequest extends ZnifferMessage {
	public constructor(options: ZnifferSetFrequencyRequestOptions) {
		super({
			messageType: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.SetFrequency,
		});

		this.frequency = options.frequency;
	}

	public frequency: ZnifferRegion;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.frequency]);
		return super.serialize();
	}
}
export class ZnifferSetFrequencyResponse extends ZnifferMessage {
	// No payload
}

export class ZnifferGetFrequenciesRequest extends ZnifferMessage {
	public constructor() {
		super({
			messageType: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencies,
		});
	}
}
export class ZnifferGetFrequenciesResponse extends ZnifferMessage {
	public constructor(options: ZnifferMessageOptions) {
		super(options);

		if (gotDeserializationOptions(options)) {
			this.currentFrequency = this.payload[0];
			this.supportedFrequencies = [
				...this.payload.subarray(1),
			];
		} else {
			throw new ZWaveError(
				`Sending ${this.constructor.name} is not supported!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
	}

	public readonly currentFrequency: ZnifferRegion;
	public readonly supportedFrequencies: readonly ZnifferRegion[];
}

export class ZnifferStartRequest extends ZnifferMessage {
	public constructor() {
		super({
			messageType: ZnifferMessageType.Command,
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
			messageType: ZnifferMessageType.Command,
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
			messageType: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.SetBaudRate,
		});

		this.baudrate = options.baudrate;
	}

	public baudrate: 0;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.baudrate]);
		return super.serialize();
	}
}
export class ZnifferSetBaudRateResponse extends ZnifferMessage {
	// No payload
}

export interface ZnifferGetFrequencyInfoRequestOptions {
	frequency: ZnifferRegion;
}

export class ZnifferGetFrequencyInfoRequest extends ZnifferMessage {
	public constructor(options: ZnifferGetFrequencyInfoRequestOptions) {
		super({
			messageType: ZnifferMessageType.Command,
			functionType: ZnifferFunctionType.GetFrequencyInfo,
		});

		this.frequency = options.frequency;
	}

	public frequency: ZnifferRegion;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.frequency]);
		return super.serialize();
	}
}

export class ZnifferGetFrequencyInfoResponse extends ZnifferMessage {
	public constructor(options: ZnifferMessageOptions) {
		super(options);

		if (gotDeserializationOptions(options)) {
			this.frequency = this.payload[0];
			this.numChannels = this.payload[1];
			this.frequencyName = this.payload
				.subarray(2)
				.toString("ascii");
		} else {
			throw new ZWaveError(
				`Sending ${this.constructor.name} is not supported!`,
				ZWaveErrorCodes.Driver_NotSupported,
			);
		}
	}

	public readonly frequency: ZnifferRegion;
	public readonly numChannels: number;
	public readonly frequencyName: string;
}
