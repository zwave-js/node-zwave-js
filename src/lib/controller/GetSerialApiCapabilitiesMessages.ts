import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority} from "../message/Message";
import { num2hex, padStart } from "../util/strings";

const NUM_FUNCTIONS = 256;
const NUM_FUNCTION_BYTES = NUM_FUNCTIONS / 8;

@messageTypes(MessageType.Request, FunctionType.GetSerialApiCapabilities)
@expectedResponse(FunctionType.GetSerialApiCapabilities)
@priority(MessagePriority.Controller)
export class GetSerialApiCapabilitiesRequest extends Message {

}

@messageTypes(MessageType.Response, FunctionType.GetSerialApiCapabilities)
export class GetSerialApiCapabilitiesResponse extends Message {

	private _serialApiVersion: string;
	public get serialApiVersion() {
		return this._serialApiVersion;
	}

	private _manufacturerId: number;
	public get manufacturerId() {
		return this._manufacturerId;
	}

	private _productType: number;
	public get productType() {
		return this._productType;
	}

	private _productId: number;
	public get productId() {
		return this._productId;
	}

	private _supportedFunctionTypes: FunctionType[];
	public get supportedFunctionTypes(): FunctionType[] {
		return this._supportedFunctionTypes;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// The first 8 bytes are the api version, manufacturer id, product type and product id
		this._serialApiVersion = `${this.payload[0]}.${this.payload[1]}`;
		this._manufacturerId = this.payload.readUInt16BE(2);
		this._productType = this.payload.readUInt16BE(4);
		this._productId = this.payload.readUInt16BE(6);
		// then a 256bit bitmask for the supported command classes follows
		const functionBitMask = this.payload.slice(8, 8 + NUM_FUNCTION_BYTES);
		this._supportedFunctionTypes = [];
		for (let functionType = 1; functionType <= NUM_FUNCTIONS; functionType++) {
			const byteNum = (functionType - 1) >>> 3; // type / 8
			const bitNum = (functionType - 1) % 8;
			if ((functionBitMask[byteNum] & (1 << bitNum)) !== 0) this._supportedFunctionTypes.push(functionType);
		}

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			serialApiVersion: this.serialApiVersion,
			manufacturerId: this.manufacturerId,
			productType: this.productType,
			productId: this.productId,
			supportedFunctionTypes: this.supportedFunctionTypes.map(type => type in FunctionType ? FunctionType[type] : num2hex(type)),
		});
	}
}
