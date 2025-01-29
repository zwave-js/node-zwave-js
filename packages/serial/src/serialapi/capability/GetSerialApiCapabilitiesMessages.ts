import { MessagePriority, encodeBitMask, parseBitMask } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared/safe";

const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;

@messageTypes(MessageType.Request, FunctionType.GetSerialApiCapabilities)
@expectedResponse(FunctionType.GetSerialApiCapabilities)
@priority(MessagePriority.Controller)
export class GetSerialApiCapabilitiesRequest extends Message {}

export interface GetSerialApiCapabilitiesResponseOptions {
	firmwareVersion: string;
	manufacturerId: number;
	productType: number;
	productId: number;
	supportedFunctionTypes: FunctionType[];
}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiCapabilities)
export class GetSerialApiCapabilitiesResponse extends Message {
	public constructor(
		options: GetSerialApiCapabilitiesResponseOptions & MessageBaseOptions,
	) {
		super(options);

		this.firmwareVersion = options.firmwareVersion;
		this.manufacturerId = options.manufacturerId;
		this.productType = options.productType;
		this.productId = options.productId;
		this.supportedFunctionTypes = options.supportedFunctionTypes;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetSerialApiCapabilitiesResponse {
		// The first 8 bytes are the api version, manufacturer id, product type and product id
		const firmwareVersion = `${raw.payload[0]}.${raw.payload[1]}`;
		const manufacturerId = raw.payload.readUInt16BE(2);
		const productType = raw.payload.readUInt16BE(4);
		const productId = raw.payload.readUInt16BE(6);

		// then a 256bit bitmask for the supported command classes follows
		const functionBitMask = raw.payload.subarray(
			8,
			8 + NUM_FUNCTION_BYTES,
		);
		const supportedFunctionTypes: FunctionType[] = parseBitMask(
			functionBitMask,
		);

		return new this({
			firmwareVersion,
			manufacturerId,
			productType,
			productId,
			supportedFunctionTypes,
		});
	}

	public firmwareVersion: string;
	public manufacturerId: number;
	public productType: number;
	public productId: number;
	public supportedFunctionTypes: FunctionType[];

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = new Bytes(8 + NUM_FUNCTION_BYTES);

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
		this.payload.set(functionBitMask, 8);

		return super.serialize(ctx);
	}
}
