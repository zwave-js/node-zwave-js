import { MessagePriority } from "@zwave-js/core";
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

export interface SetSerialApiTimeoutsRequestOptions {
	ackTimeout: number;
	byteTimeout: number;
}

@messageTypes(MessageType.Request, FunctionType.SetSerialApiTimeouts)
@expectedResponse(FunctionType.SetSerialApiTimeouts)
@priority(MessagePriority.Controller)
export class SetSerialApiTimeoutsRequest extends Message {
	public constructor(
		options: SetSerialApiTimeoutsRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.ackTimeout = options.ackTimeout;
		this.byteTimeout = options.byteTimeout;
	}

	public ackTimeout: number;
	public byteTimeout: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([
			Math.round(this.ackTimeout / 10),
			Math.round(this.byteTimeout / 10),
		]);
		return super.serialize(ctx);
	}
}

export interface SetSerialApiTimeoutsResponseOptions {
	oldAckTimeout: number;
	oldByteTimeout: number;
}

@messageTypes(MessageType.Response, FunctionType.SetSerialApiTimeouts)
export class SetSerialApiTimeoutsResponse extends Message {
	public constructor(
		options: SetSerialApiTimeoutsResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.oldAckTimeout = options.oldAckTimeout;
		this.oldByteTimeout = options.oldByteTimeout;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetSerialApiTimeoutsResponse {
		const oldAckTimeout = raw.payload[0] * 10;
		const oldByteTimeout = raw.payload[1] * 10;

		return new this({
			oldAckTimeout,
			oldByteTimeout,
		});
	}

	public oldAckTimeout: number;
	public oldByteTimeout: number;
}
