import { expectedResponse, FunctionType, Message, MessagePriority, MessageType, messageTypes, priority } from "../message/Message";

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
}

export enum TransmitStatus {
	OK = 0x00, // Transmission complete and ACK received
	NoAck = 0x01, // Transmission complete, no ACK received
	Fail = 0x02, // Transmission failed
	NotIdle = 0x03, // Transmission failed, network busy
	NoRoute = 0x04, // Tranmission complete, no return route
}

let lastCallbackId = 0;
function getNextCallbackId(): number {
	lastCallbackId++;
	if (lastCallbackId > 0xff) lastCallbackId = 1;
	return lastCallbackId;
}

@messageTypes(MessageType.Request, FunctionType.SendData)
@expectedResponse(FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequest extends Message {

	// tslint:disable:unified-signatures
	// empty constructor to parse messages
	constructor();
	// default constructor to send messages
	constructor(
		nodeId: number,
		data?: Buffer,
		transmitOptions?: TransmitOptions,
		callbackId?: number,
	);
	constructor(
		public nodeId?: number,
		public data?: Buffer,
		public transmitOptions?: TransmitOptions,
		public callbackId?: number,
	) {
		super();
		if (nodeId != null) {
			// non-empty constructor -> define default values
			if (this.data == null) this.data = Buffer.from([]);
			if (this.transmitOptions == null) this.transmitOptions = TransmitOptions.DEFAULT;
			if (this.callbackId == null) this.callbackId = getNextCallbackId();
		}
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		const ret = Buffer.allocUnsafe(this.data.length + 4);
		ret[0] = this.nodeId;
		ret[1] = this.data.length;
		this.data.copy(ret, 2);
		ret[ret.length - 2] = this.transmitOptions;
		ret[ret.length - 1] = this.callbackId;
		this.payload = ret;

		return super.serialize();
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this.nodeId = this.payload[0];
		const dataLength = this.payload[1];
		this.data = Buffer.allocUnsafe(dataLength);
		this.payload.copy(this.data, 0, 2, 2 + dataLength);
		this.transmitOptions = this.payload[this.payload.length - 2];
		this.callbackId = this.payload[this.payload.length - 1];

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			nodeId: this.nodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			data: this.data.toString("hex"),
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message {

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private _errorCode: number;
	public get errorCode(): number {
		return this._errorCode;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			errorCode: this.errorCode,
		});
	}

}
