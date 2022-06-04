import type { MessageOrCCLogEntry, MessageRecord } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { RSSI, rssiToString } from "../../controller/_Types";
import { parseRSSI, tryParseRSSI } from "../transport/SendDataShared";

@messageTypes(MessageType.Request, FunctionType.GetBackgroundRSSI)
@priority(MessagePriority.Normal)
@expectedResponse(FunctionType.GetBackgroundRSSI)
export class GetBackgroundRSSIRequest extends Message {}

@messageTypes(MessageType.Response, FunctionType.GetBackgroundRSSI)
export class GetBackgroundRSSIResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.rssiChannel0 = parseRSSI(this.payload, 0);
		this.rssiChannel1 = parseRSSI(this.payload, 1);
		this.rssiChannel2 = tryParseRSSI(this.payload, 2);
	}

	public readonly rssiChannel0: RSSI;
	public readonly rssiChannel1: RSSI;
	public readonly rssiChannel2?: RSSI;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"channel 0": rssiToString(this.rssiChannel0),
			"channel 1": rssiToString(this.rssiChannel1),
		};
		if (this.rssiChannel2 != undefined) {
			message["channel 2"] = rssiToString(this.rssiChannel2);
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
