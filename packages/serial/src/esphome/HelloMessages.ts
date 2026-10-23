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
	decodeStringField,
	decodeVarInt,
	encodeStringField,
	encodeVarintField,
	parseProtobufMessage,
	skipField,
} from "./ProtobufHelpers.js";

export interface HelloRequestOptions extends ESPHomeMessageBaseOptions {
	clientInfo: string;
	apiVersionMajor: number;
	apiVersionMinor: number;
}

@messageType(ESPHomeMessageType.HelloRequest)
export class HelloRequest extends ESPHomeMessage {
	public constructor(options: HelloRequestOptions) {
		super(options);
		this.clientInfo = options.clientInfo;
		this.apiVersionMajor = options.apiVersionMajor;
		this.apiVersionMinor = options.apiVersionMinor;
	}

	public static from(raw: ESPHomeMessageRaw): HelloRequest {
		let clientInfo = "";
		let apiVersionMajor = 0;
		let apiVersionMinor = 0;

		parseProtobufMessage(
			raw.payload,
			(fieldNumber, wireType, data, offset) => {
				switch (fieldNumber) {
					case 1: // client_info (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for clientInfo",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const clientInfoResult = decodeStringField(
							data,
							offset,
						);
						clientInfo = clientInfoResult.value;
						return offset + clientInfoResult.bytesRead;

					case 2: // api_version_major (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for apiVersionMajor",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const majorResult = decodeVarInt(data, offset);
						apiVersionMajor = majorResult.value;
						return offset + majorResult.bytesRead;

					case 3: // api_version_minor (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for apiVersionMinor",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const minorResult = decodeVarInt(data, offset);
						apiVersionMinor = minorResult.value;
						return offset + minorResult.bytesRead;

					default:
						return skipField(data, offset, wireType);
				}
			},
		);

		return new this({
			clientInfo,
			apiVersionMajor,
			apiVersionMinor,
		});
	}

	public clientInfo: string;
	public apiVersionMajor: number;
	public apiVersionMinor: number;

	public serialize(): Bytes {
		const parts: (BytesView | number[])[] = [];

		// Field 1: client_info (string)
		if (this.clientInfo) {
			parts.push(encodeStringField(1, this.clientInfo));
		}

		// Field 2: api_version_major (uint32)
		parts.push(encodeVarintField(2, this.apiVersionMajor));

		// Field 3: api_version_minor (uint32)
		parts.push(encodeVarintField(3, this.apiVersionMinor));

		this.payload = Bytes.concat(parts);
		return super.serialize();
	}
}

export interface HelloResponseOptions extends ESPHomeMessageBaseOptions {
	apiVersionMajor: number;
	apiVersionMinor: number;
	serverInfo: string;
	name: string;
}

@messageType(ESPHomeMessageType.HelloResponse)
export class HelloResponse extends ESPHomeMessage {
	public constructor(options: HelloResponseOptions) {
		super(options);
		this.apiVersionMajor = options.apiVersionMajor;
		this.apiVersionMinor = options.apiVersionMinor;
		this.serverInfo = options.serverInfo;
		this.name = options.name;
	}

	public static from(raw: ESPHomeMessageRaw): HelloResponse {
		let apiVersionMajor = 0;
		let apiVersionMinor = 0;
		let serverInfo = "";
		let name = "";

		parseProtobufMessage(
			raw.payload,
			(fieldNumber, wireType, data, offset) => {
				switch (fieldNumber) {
					case 1: // api_version_major (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for apiVersionMajor",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const majorResult = decodeVarInt(data, offset);
						apiVersionMajor = majorResult.value;
						return offset + majorResult.bytesRead;

					case 2: // api_version_minor (uint32)
						if (wireType !== WireType.Varint) {
							throw new ZWaveError(
								"Invalid wire type for apiVersionMinor",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const minorResult = decodeVarInt(data, offset);
						apiVersionMinor = minorResult.value;
						return offset + minorResult.bytesRead;

					case 3: // server_info (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for serverInfo",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const serverInfoResult = decodeStringField(
							data,
							offset,
						);
						serverInfo = serverInfoResult.value;
						return offset + serverInfoResult.bytesRead;

					case 4: // name (string)
						if (wireType !== WireType.LengthDelimited) {
							throw new ZWaveError(
								"Invalid wire type for name",
								ZWaveErrorCodes.PacketFormat_InvalidPayload,
							);
						}
						const nameResult = decodeStringField(data, offset);
						name = nameResult.value;
						return offset + nameResult.bytesRead;

					default:
						return skipField(data, offset, wireType);
				}
			},
		);

		return new this({
			apiVersionMajor,
			apiVersionMinor,
			serverInfo,
			name,
		});
	}

	public apiVersionMajor: number;
	public apiVersionMinor: number;
	public serverInfo: string;
	public name: string;

	public serialize(): Bytes {
		const parts: (BytesView | number[])[] = [];

		// Field 1: api_version_major (uint32)
		parts.push(encodeVarintField(1, this.apiVersionMajor));

		// Field 2: api_version_minor (uint32)
		parts.push(encodeVarintField(2, this.apiVersionMinor));

		// Field 3: server_info (string)
		if (this.serverInfo) {
			parts.push(encodeStringField(3, this.serverInfo));
		}

		// Field 4: name (string)
		if (this.name) {
			parts.push(encodeStringField(4, this.name));
		}

		this.payload = Bytes.concat(parts);
		return super.serialize();
	}
}
