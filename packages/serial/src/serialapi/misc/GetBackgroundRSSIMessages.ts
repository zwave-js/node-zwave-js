import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type RSSI,
	rssiToString,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { parseRSSI, tryParseRSSI } from "../transport/SendDataShared.js";

@messageTypes(MessageType.Request, FunctionType.GetBackgroundRSSI)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetBackgroundRSSI)
export class GetBackgroundRSSIRequest extends Message {}

export interface GetBackgroundRSSIResponseOptions {
	rssiChannel0: number;
	rssiChannel1: number;
	rssiChannel2?: number;
	rssiChannel3?: number;
}

@messageTypes(MessageType.Response, FunctionType.GetBackgroundRSSI)
export class GetBackgroundRSSIResponse extends Message {
	public constructor(
		options: GetBackgroundRSSIResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.rssiChannel0 = options.rssiChannel0;
		this.rssiChannel1 = options.rssiChannel1;
		this.rssiChannel2 = options.rssiChannel2;
		this.rssiChannel3 = options.rssiChannel3;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): GetBackgroundRSSIResponse {
		const rssiChannel0 = parseRSSI(raw.payload, 0);
		const rssiChannel1 = parseRSSI(raw.payload, 1);
		const rssiChannel2 = tryParseRSSI(raw.payload, 2);
		const rssiChannel3 = tryParseRSSI(raw.payload, 3);

		return new this({
			rssiChannel0,
			rssiChannel1,
			rssiChannel2,
			rssiChannel3,
		});
	}

	public readonly rssiChannel0: RSSI;
	public readonly rssiChannel1: RSSI;
	public readonly rssiChannel2?: RSSI;
	public readonly rssiChannel3?: RSSI;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"channel 0": rssiToString(this.rssiChannel0),
			"channel 1": rssiToString(this.rssiChannel1),
		};
		if (this.rssiChannel2 != undefined) {
			message["channel 2"] = rssiToString(this.rssiChannel2);
		}
		if (this.rssiChannel3 != undefined) {
			message["channel 3"] = rssiToString(this.rssiChannel3);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
