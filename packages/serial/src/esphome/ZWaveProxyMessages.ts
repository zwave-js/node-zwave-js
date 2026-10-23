import { ZWaveError, ZWaveErrorCodes } from "@zwave-js/core";
import { Bytes, type BytesView } from "@zwave-js/shared";

import {
	ESPHomeMessage,
	type ESPHomeMessageBaseOptions,
	type ESPHomeMessageRaw,
	ESPHomeMessageType,
	messageType,
} from "./ESPHomeMessage.js";
import {
	WireType,
	decodeLengthDelimitedField,
	encodeStringField,
	encodeVarintField,
	parseProtobufMessage,
	skipField,
} from "./ProtobufHelpers.js";

/**
 * ESPHome Z-Wave proxy request types enum
 */
export enum ESPHomeZWaveProxyRequestType {
	Subscribe = 0,
	Unsubscribe = 1,
}

export interface ZWaveProxyFrameOptions extends ESPHomeMessageBaseOptions {
	data: Bytes;
}

export interface ZWaveProxyRequestOptions extends ESPHomeMessageBaseOptions {
	type: ESPHomeZWaveProxyRequestType;
}

@messageType(ESPHomeMessageType.ZWaveProxyFrame)
export class ZWaveProxyFrame extends ESPHomeMessage {
	public constructor(options: ZWaveProxyFrameOptions) {
		super(options);
		this.data = options.data;
	}

	public static from(raw: ESPHomeMessageRaw): ZWaveProxyFrame {
		let data = new Bytes();

		parseProtobufMessage(
			raw.payload,
			(fieldNumber, wireType, dataBuffer, offset) => {
				switch (fieldNumber) {
					case 1: // data (bytes as string on wire)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for data",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const dataResult = decodeLengthDelimitedField(
							dataBuffer,
							offset,
						);
						data = Bytes.from(dataResult.value);
						return offset + dataResult.bytesRead;

					default:
						return skipField(dataBuffer, offset, wireType);
				}
			},
		);

		return new this({ data });
	}

	public data: Bytes;

	public serialize(): Bytes {
		const parts: (BytesView | number[])[] = [];

		// Field 1: data (bytes encoded as string field on wire)
		if (this.data.length > 0) {
			parts.push(encodeStringField(1, this.data));
		}

		this.payload = Bytes.concat(parts);
		return super.serialize();
	}
}

@messageType(ESPHomeMessageType.ZWaveProxyRequest)
export class ZWaveProxyRequest extends ESPHomeMessage {
	public constructor(options: ZWaveProxyRequestOptions) {
		super(options);
		this.type = options.type;
	}

	public type: ESPHomeZWaveProxyRequestType;

	public serialize(): Bytes {
		const parts: (BytesView | number[])[] = [];

		// Field 1: request type (varint encoded on wire)
		parts.push(encodeVarintField(1, this.type));

		this.payload = Bytes.concat(parts);
		return super.serialize();
	}
}
