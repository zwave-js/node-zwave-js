import {
	type MessageOrCCLogEntry,
	type RSSI,
	validatePayload,
} from "@zwave-js/core";
import type { BytesView } from "@zwave-js/shared";

import { RCPFunctionType, RCPMessageType } from "../../message/Constants.js";
import {
	RCPMessage,
	type RCPMessageBaseOptions,
	type RCPMessageParsingContext,
	type RCPMessageRaw,
	rcpMessageTypes,
} from "../../message/RCPMessages.js";

export interface ReceiveCallbackOptions {
	data: BytesView;
	rssi: RSSI;
	lqi: number;
	channel: number;
}

@rcpMessageTypes(RCPMessageType.Callback, RCPFunctionType.Receive)
export class ReceiveCallback extends RCPMessage {
	public constructor(
		options: ReceiveCallbackOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.data = options.data;
		this.rssi = options.rssi;
		this.lqi = options.lqi;
		this.channel = options.channel;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): ReceiveCallback {
		validatePayload(raw.payload.length >= 1);
		const dataLength = raw.payload[0];
		// The data is followed by RSSI, LQI and channel
		validatePayload(raw.payload.length >= 1 + dataLength + 3);
		const data = raw.payload.slice(1, 1 + dataLength);
		const offset = 1 + dataLength;
		const rssi = raw.payload.readInt8(offset);
		// FIXME: LQI is useless in Z-Wave, it's always 0xff
		const lqi = raw.payload[offset + 1];
		const channel = raw.payload[offset + 2];

		return new this({
			data,
			rssi,
			lqi,
			channel,
		});
	}

	public data: BytesView;
	public rssi: RSSI;
	public lqi: number;
	public channel: number;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				channel: this.channel,
				RSSI: this.rssi, // FIXME: convert to actual dBm in firmware
				lqi: this.lqi,
				data: `(${this.data.length} bytes)`,
			},
		};
	}
}
