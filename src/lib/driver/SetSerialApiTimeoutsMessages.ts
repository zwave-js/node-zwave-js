import { expectedResponse, FunctionType, Message,  MessageType, messageTypes} from "../message/Message";

@messageTypes(MessageType.Request, FunctionType.SetSerialApiTimeouts)
@expectedResponse(FunctionType.SetSerialApiTimeouts)
export class SetSerialApiTimeoutsRequest extends Message {

	constructor()
	constructor(
		ackTimeout: number,
		byteTimeout: number,
	)
	constructor(
		public ackTimeout?: number,
		public byteTimeout?: number,
	) {
		super();
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([
			Math.round(this.ackTimeout / 10),
			Math.round(this.byteTimeout / 10),
		]);
		return super.serialize();
	}

	public toJSON() {
		return super.toJSONInherited({
			ackTimeout: this.ackTimeout,
			byteTimeout: this.byteTimeout,
		});
	}

}

@messageTypes(MessageType.Response, FunctionType.SetSerialApiTimeouts)
export class SetSerialApiTimeoutsResponse extends Message {

	private _oldAckTimeout: number;
	public get oldAckTimeout(): number {
		return this._oldAckTimeout;
	}

	private _oldByteTimeout: number;
	public get oldByteTimeout(): number {
		return this._oldByteTimeout;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._oldAckTimeout = this.payload[0] * 10;
		this._oldByteTimeout = this.payload[1] * 10;

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			oldAckTimeout: this.oldAckTimeout,
			oldByteTimeout: this.oldByteTimeout,
		});
	}

}
