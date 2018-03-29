import { expectedResponse, FunctionType, Message,  MessageType, messageTypes} from "../message/Message";

@messageTypes(MessageType.Request, FunctionType.GetSerialApiCapabilities)
@expectedResponse(FunctionType.GetSerialApiCapabilities)
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

	private _functionBitMask: Buffer;
	public get functionBitMask(): Buffer {
		return this._functionBitMask;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		// The first 8 bytes are the api version, manufacturer id, product type and product id
		this._serialApiVersion = `${this.payload[0]}.${this.payload[1]}`;
		this._manufacturerId = this.payload.readUInt16BE(2);
		this._productType = this.payload.readUInt16BE(4);
		this._productId = this.payload.readUInt16BE(6);
		// then a 256bit bitmask for the supported command classes follows
		this._functionBitMask = Buffer.allocUnsafe(256 / 8);
		this.payload.copy(this._functionBitMask, 0, 8, 8 + this._functionBitMask.length);

		return ret;
	}
}
