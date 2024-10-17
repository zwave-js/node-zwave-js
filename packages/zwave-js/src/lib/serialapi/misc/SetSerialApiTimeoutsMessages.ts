import { MessagePriority } from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";

interface SetSerialApiTimeoutsRequestOptions extends MessageBaseOptions {
	ackTimeout: number;
	byteTimeout: number;
}

@messageTypes(MessageType.Request, FunctionType.SetSerialApiTimeouts)
@expectedResponse(FunctionType.SetSerialApiTimeouts)
@priority(MessagePriority.Controller)
export class SetSerialApiTimeoutsRequest extends Message {
	public constructor(
		options: SetSerialApiTimeoutsRequestOptions,
	) {
		super(options);
		this.ackTimeout = options.ackTimeout;
		this.byteTimeout = options.byteTimeout;
	}

	public ackTimeout: number;
	public byteTimeout: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([
			Math.round(this.ackTimeout / 10),
			Math.round(this.byteTimeout / 10),
		]);
		return super.serialize(ctx);
	}
}

@messageTypes(MessageType.Response, FunctionType.SetSerialApiTimeouts)
export class SetSerialApiTimeoutsResponse extends Message {
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this._oldAckTimeout = this.payload[0] * 10;
		this._oldByteTimeout = this.payload[1] * 10;
	}

	private _oldAckTimeout: number;
	public get oldAckTimeout(): number {
		return this._oldAckTimeout;
	}

	private _oldByteTimeout: number;
	public get oldByteTimeout(): number {
		return this._oldByteTimeout;
	}
}
