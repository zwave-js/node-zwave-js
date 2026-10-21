import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

import { decodeVarInt, encodeVarInt } from "./ProtobufHelpers.js";

/**
 * ESPHome message types enum
 */
export enum ESPHomeMessageType {
	// Connection messages
	HelloRequest = 1,
	HelloResponse = 2,
	DisconnectRequest = 5,
	DisconnectResponse = 6,
	PingRequest = 7,
	PingResponse = 8,
	DeviceInfoRequest = 9,
	DeviceInfoResponse = 10,

	// Z-Wave proxy messages
	ZWaveProxyFrame = 128,
	ZWaveProxyRequest = 129,
}

/**
 * Represents a raw ESPHome message with minimal parsing
 */
export class ESPHomeMessageRaw {
	public constructor(
		public readonly messageType: ESPHomeMessageType,
		public readonly payload: Bytes,
	) {}

	/**
	 * Parses a raw plaintext ESPHome frame into a MessageRaw instance.
	 * Format: [0x00][VarInt size][VarInt type][payload]
	 */
	public static parse(data: BytesView): {
		message: ESPHomeMessageRaw;
		bytesRead: number;
	} {
		if (data.length < 3) {
			throw new ZWaveError(
				"Frame too short",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		let offset = 0;

		// Check indicator byte
		if (data[offset] !== 0x00) {
			throw new ZWaveError(
				`Invalid frame indicator: expected 0x00, got 0x${data[offset]
					.toString(16)
					.padStart(2, "0")}`,
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		offset++;

		// Decode payload size
		const payloadSize = decodeVarInt(data, offset);
		offset += payloadSize.bytesRead;

		// Decode message type
		const messageType = decodeVarInt(data, offset);
		offset += messageType.bytesRead;

		// Extract payload
		if (offset + payloadSize.value > data.length) {
			throw new ZWaveError(
				"Could not deserialize the message because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		const payload = Bytes.view(
			data.slice(offset, offset + payloadSize.value),
		);

		return {
			message: new ESPHomeMessageRaw(messageType.value, payload),
			bytesRead: offset + payloadSize.value,
		};
	}

	/**
	 * Parses a raw Noise-decrypted ESPHome message into a MessageRaw instance.
	 * Format: [2-byte BE type][2-byte BE len][payload]
	 */
	public static parseFromNoise(data: Bytes): {
		message: ESPHomeMessageRaw;
		bytesRead: number;
	} {
		if (data.length < 4) {
			throw new ZWaveError(
				"Noise message too short",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		const messageType = data.readUInt16BE(0);
		const dataLen = data.readUInt16BE(2);

		if (4 + dataLen > data.length) {
			throw new ZWaveError(
				"Noise message was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}

		const payload = Bytes.view(data.subarray(4, 4 + dataLen));
		return {
			message: new ESPHomeMessageRaw(messageType, payload),
			bytesRead: 4 + dataLen,
		};
	}
}

/**
 * Base interface for ESPHome message options
 */
export interface ESPHomeMessageBaseOptions {
	messageType?: ESPHomeMessageType;
}

/**
 * Interface for message options including payload
 */
export interface ESPHomeMessageOptions extends ESPHomeMessageBaseOptions {
	payload?: Bytes;
}

export type ESPHomeMessageConstructor<T extends ESPHomeMessage> =
	typeof ESPHomeMessage & {
		new (options: ESPHomeMessageBaseOptions): T;
	};

/**
 * Base class for all ESPHome messages
 */
export class ESPHomeMessage {
	public constructor(options: ESPHomeMessageOptions = {}) {
		const messageType = options.messageType ?? getMessageType(this);

		if (messageType == undefined) {
			throw new ZWaveError(
				"An ESPHome message must have a given or predefined message type",
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.messageType = messageType;
		this.payload = options.payload ?? new Bytes();
	}

	public messageType: ESPHomeMessageType;
	public payload: Bytes;

	/**
	 * Parses a raw ESPHome message and returns the appropriate message instance
	 */
	public static parse(data: BytesView): {
		message: ESPHomeMessage;
		bytesRead: number;
	} {
		const { message: raw, bytesRead } = ESPHomeMessageRaw.parse(data);
		const Constructor =
			getESPHomeMessageConstructor(raw.messageType) ?? ESPHomeMessage;
		return { message: Constructor.from(raw), bytesRead };
	}

	/**
	 * Creates an instance of the message from a raw message.
	 */
	public static from(raw: ESPHomeMessageRaw): ESPHomeMessage {
		// oxlint-disable-next-line @zwave-js/no-unexpected-parse-errors -- message type is always set
		return new this({
			messageType: raw.messageType,
			payload: raw.payload,
		});
	}

	/**
	 * Serializes this message into an ESPHome frame (plaintext format)
	 */
	public serialize(): Bytes {
		return Bytes.concat([
			[0x00], // Indicator byte
			encodeVarInt(this.payload.length),
			encodeVarInt(this.messageType),
			this.payload,
		]);
	}

	/**
	 * Serializes this message for Noise transport.
	 * Format: [2-byte BE type][2-byte BE len][payload]
	 */
	public serializeForNoise(): Bytes {
		const header = new Bytes(4);
		header.writeUInt16BE(this.messageType, 0);
		header.writeUInt16BE(this.payload.length, 2);
		return Bytes.concat([header, this.payload]);
	}

	/**
	 * Parses a message from Noise-decrypted data.
	 * Format: [2-byte BE type][2-byte BE len][payload]
	 */
	public static parseFromNoise(data: Bytes): {
		message: ESPHomeMessage;
		bytesRead: number;
	} {
		const { message: raw, bytesRead } =
			ESPHomeMessageRaw.parseFromNoise(data);
		const Constructor =
			getESPHomeMessageConstructor(raw.messageType) ?? ESPHomeMessage;
		return { message: Constructor.from(raw), bytesRead };
	}
}

// Storage for message type decorators
const MESSAGE_TYPE_STORAGE = new Map<any, ESPHomeMessageType>();
const MESSAGE_CONSTRUCTOR_STORAGE = new Map<
	ESPHomeMessageType,
	ESPHomeMessageConstructor<ESPHomeMessage>
>();

/**
 * Decorator to set the message type for a message class
 */
export function messageType(type: ESPHomeMessageType) {
	return function (target: any): any {
		MESSAGE_TYPE_STORAGE.set(target, type);
		MESSAGE_CONSTRUCTOR_STORAGE.set(type, target);
		return target;
	};
}

/**
 * Gets the message type for a message instance/class
 */
function getMessageType(msg: any): ESPHomeMessageType | undefined {
	return MESSAGE_TYPE_STORAGE.get(msg.constructor);
}

/**
 * Looks up the message constructor for a given ESPHome message type
 */
function getESPHomeMessageConstructor(
	messageType: ESPHomeMessageType,
): ESPHomeMessageConstructor<ESPHomeMessage> | undefined {
	return MESSAGE_CONSTRUCTOR_STORAGE.get(messageType);
}
