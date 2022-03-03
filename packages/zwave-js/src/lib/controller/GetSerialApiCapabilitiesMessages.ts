import { parseBitMask } from "@zwave-js/core";
import type { JSONObject } from "@zwave-js/shared";
import { num2hex } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";

const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;

@messageTypes(MessageType.Request, FunctionType.GetSerialApiCapabilities)
@expectedResponse(FunctionType.GetSerialApiCapabilities)
@priority(MessagePriority.Controller)
export class GetSerialApiCapabilitiesRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiCapabilities)
export class GetSerialApiCapabilitiesResponse extends Message {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		// The first 8 bytes are the api version, manufacturer id, product type and product id
		this._firmwareVersion = `${this.payload[0]}.${this.payload[1]}`;
		this._manufacturerId = this.payload.readUInt16BE(2);
		this._productType = this.payload.readUInt16BE(4);
		this._productId = this.payload.readUInt16BE(6);
		// then a 256bit bitmask for the supported command classes follows
		const functionBitMask = this.payload.slice(8, 8 + NUM_FUNCTION_BYTES);
		this._supportedFunctionTypes = parseBitMask(functionBitMask);
	}

	private _firmwareVersion: string;
	public get firmwareVersion(): string {
		return this._firmwareVersion;
	}

	private _manufacturerId: number;
	public get manufacturerId(): number {
		return this._manufacturerId;
	}

	private _productType: number;
	public get productType(): number {
		return this._productType;
	}

	private _productId: number;
	public get productId(): number {
		return this._productId;
	}

	private _supportedFunctionTypes: FunctionType[];
	public get supportedFunctionTypes(): FunctionType[] {
		return this._supportedFunctionTypes;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			firmwareVersion: this.firmwareVersion,
			manufacturerId: this.manufacturerId,
			productType: this.productType,
			productId: this.productId,
			supportedFunctionTypes: this.supportedFunctionTypes.map((type) =>
				type in FunctionType ? FunctionType[type] : num2hex(type),
			),
		});
	}
}
