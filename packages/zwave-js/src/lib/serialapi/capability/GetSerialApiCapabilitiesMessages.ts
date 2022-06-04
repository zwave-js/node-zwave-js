import { encodeBitMask, parseBitMask } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";

const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;

@messageTypes(MessageType.Request, FunctionType.GetSerialApiCapabilities)
@expectedResponse(FunctionType.GetSerialApiCapabilities)
@priority(MessagePriority.Controller)
export class GetSerialApiCapabilitiesRequest extends Message {}

export interface GetSerialApiCapabilitiesResponseOptions
	extends MessageBaseOptions {
	firmwareVersion: string;
	manufacturerId: number;
	productType: number;
	productId: number;
	supportedFunctionTypes: FunctionType[];
}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiCapabilities)
export class GetSerialApiCapabilitiesResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetSerialApiCapabilitiesResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			// The first 8 bytes are the api version, manufacturer id, product type and product id
			this.firmwareVersion = `${this.payload[0]}.${this.payload[1]}`;
			this.manufacturerId = this.payload.readUInt16BE(2);
			this.productType = this.payload.readUInt16BE(4);
			this.productId = this.payload.readUInt16BE(6);
			// then a 256bit bitmask for the supported command classes follows
			const functionBitMask = this.payload.slice(
				8,
				8 + NUM_FUNCTION_BYTES,
			);
			this.supportedFunctionTypes = parseBitMask(functionBitMask);
		} else {
			this.firmwareVersion = options.firmwareVersion;
			this.manufacturerId = options.manufacturerId;
			this.productType = options.productType;
			this.productId = options.productId;
			this.supportedFunctionTypes = options.supportedFunctionTypes;
		}
	}

	public firmwareVersion: string;
	public manufacturerId: number;
	public productType: number;
	public productId: number;
	public supportedFunctionTypes: FunctionType[];

	public serialize(): Buffer {
		this.payload = Buffer.allocUnsafe(8 + NUM_FUNCTION_BYTES);

		const firmwareBytes = this.firmwareVersion
			.split(".", 2)
			.map((str) => parseInt(str));
		this.payload[0] = firmwareBytes[0];
		this.payload[1] = firmwareBytes[1];

		this.payload.writeUInt16BE(this.manufacturerId, 2);
		this.payload.writeUInt16BE(this.productType, 4);
		this.payload.writeUInt16BE(this.productId, 6);

		const functionBitMask = encodeBitMask(
			this.supportedFunctionTypes,
			NUM_FUNCTIONS,
		);
		functionBitMask.copy(this.payload, 8);

		return super.serialize();
	}
}
