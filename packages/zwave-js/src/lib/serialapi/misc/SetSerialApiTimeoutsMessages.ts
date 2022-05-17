import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";

interface SetSerialApiTimeoutsRequestOptions extends MessageBaseOptions {
	ackTimeout: number;
	byteTimeout: number;
}

@messageTypes(MessageType.Request, FunctionType.SetSerialApiTimeouts)
@expectedResponse(FunctionType.SetSerialApiTimeouts)
@priority(MessagePriority.Controller)
export class SetSerialApiTimeoutsRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: SetSerialApiTimeoutsRequestOptions,
	) {
		super(host, options);
		this.ackTimeout = options.ackTimeout;
		this.byteTimeout = options.byteTimeout;
	}

	public ackTimeout: number;
	public byteTimeout: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([
			Math.round(this.ackTimeout / 10),
			Math.round(this.byteTimeout / 10),
		]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			ackTimeout: this.ackTimeout,
			byteTimeout: this.byteTimeout,
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.SetSerialApiTimeouts)
export class SetSerialApiTimeoutsResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
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

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			oldAckTimeout: this.oldAckTimeout,
			oldByteTimeout: this.oldByteTimeout,
		});
	}
}
