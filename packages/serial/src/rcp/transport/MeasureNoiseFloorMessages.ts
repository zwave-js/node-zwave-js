import {
	type MessageOrCCLogEntry,
	type RSSI,
	ZWaveError,
	ZWaveErrorCodes,
	rssiToString,
	validatePayload,
} from "@zwave-js/core";
import { Bytes } from "@zwave-js/shared";

import { RCPFunctionType, RCPMessageType } from "../../message/Constants.js";
import {
	RCPMessage,
	type RCPMessageBaseOptions,
	type RCPMessageEncodingContext,
	type RCPMessageParsingContext,
	type RCPMessageRaw,
	expectedRCPResponse,
	rcpMessageTypes,
} from "../../message/RCPMessages.js";

export interface MeasureNoiseFloorRequestOptions {
	channel: number;
}

@rcpMessageTypes(RCPMessageType.Request, RCPFunctionType.MeasureNoiseFloor)
@expectedRCPResponse(RCPFunctionType.MeasureNoiseFloor)
export class MeasureNoiseFloorRequest extends RCPMessage {
	public constructor(
		options: MeasureNoiseFloorRequestOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.channel = options.channel;
	}

	public channel: number;

	public serialize(ctx: RCPMessageEncodingContext): Promise<Bytes> {
		if (
			!Number.isInteger(this.channel)
			|| this.channel < 0
			|| this.channel > 4
		) {
			throw new ZWaveError(
				`The channel must be an integer between 0 and 4`,
				ZWaveErrorCodes.Argument_Invalid,
			);
		}

		this.payload = Bytes.from([this.channel]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				channel: this.channel,
			},
		};
	}
}

export interface MeasureNoiseFloorResponseOptions {
	noiseFloor: RSSI;
}

@rcpMessageTypes(RCPMessageType.Response, RCPFunctionType.MeasureNoiseFloor)
export class MeasureNoiseFloorResponse extends RCPMessage {
	public constructor(
		options: MeasureNoiseFloorResponseOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.noiseFloor = options.noiseFloor;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): MeasureNoiseFloorResponse {
		validatePayload(raw.payload.length >= 1);
		const noiseFloor: RSSI = raw.payload.readInt8(0);

		return new this({
			noiseFloor,
		});
	}

	/** The measured noise floor in dBm, or an RssiError if no measurement could be taken */
	public noiseFloor: RSSI;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"noise floor": rssiToString(this.noiseFloor),
			},
		};
	}
}
