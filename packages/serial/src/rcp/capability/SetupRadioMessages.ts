import {
	ChannelConfiguration,
	type MaybeNotKnown,
	type MessageOrCCLogEntry,
	type ProtocolDataRate,
	RFRegion,
	createSimpleReflectionDecorator,
	logBuffer,
	logList,
	mergeLogDict,
	parseBitMask,
	protocolDataRateToString,
	validatePayload,
	znifferProtocolDataRateToProtocolDataRate,
} from "@zwave-js/core";
import { Bytes, getEnumMemberName } from "@zwave-js/shared";

import { RCPFunctionType, RCPMessageType } from "../../message/Constants.js";
import {
	RCPMessage,
	type RCPMessageBaseOptions,
	type RCPMessageConstructor,
	type RCPMessageEncodingContext,
	type RCPMessageParsingContext,
	type RCPMessageRaw,
	expectedRCPResponse,
	rcpMessageTypes,
} from "../../message/RCPMessages.js";
import type { SuccessIndicator } from "../../message/SuccessIndicator.js";

export enum SetupRadioCommand {
	SetRegion = 1,
	GetRegion = 2,
	GetTxPowerRange = 3,
	GetCapabilities = 4,
}

/** Optional firmware features that no function ID of its own covers */
export enum RadioCapability {
	/** Transmits honor the replacement arguments that patch measurements into the frame */
	TransmitReplacements = 1,
}

export interface ChannelInfo {
	channel: number;
	frequency: number;
	dataRate: ProtocolDataRate;
}

function formatChannelInfo(channel: ChannelInfo): string {
	const frequency = (channel.frequency / 1e6).toFixed(2);
	const dataRate = protocolDataRateToString(channel.dataRate);
	return `channel ${channel.channel} (${frequency} MHz): ${dataRate}`;
}

// We need to define the decorators for Requests and Responses separately
const {
	decorator: subCommandRequest,
	lookupConstructor: getSubCommandRequestConstructor,
	lookupValue: getSubCommandForRequest,
} = createSimpleReflectionDecorator<
	typeof SetupRadioRequest,
	[command: SetupRadioCommand],
	RCPMessageConstructor<SetupRadioRequest>
>({
	name: "subCommandRequest",
});

const {
	decorator: subCommandResponse,
	lookupConstructor: getSubCommandResponseConstructor,
	lookupValue: getSubCommandForResponse,
} = createSimpleReflectionDecorator<
	typeof SetupRadioResponse,
	[command: SetupRadioCommand],
	RCPMessageConstructor<SetupRadioResponse>
>({
	name: "subCommandResponse",
});

function testResponseForSetupRadioRequest(
	sent: RCPMessage,
	received: RCPMessage,
) {
	if (!(received instanceof SetupRadioResponse)) return false;
	return (sent as SetupRadioRequest).command === received.command;
}

export interface SetupRadioRequestOptions {
	command?: SetupRadioCommand;
}

@rcpMessageTypes(RCPMessageType.Request, RCPFunctionType.SetupRadio)
@expectedRCPResponse(testResponseForSetupRadioRequest)
export class SetupRadioRequest extends RCPMessage {
	public constructor(
		options: SetupRadioRequestOptions & RCPMessageBaseOptions = {},
	) {
		super(options);
		this.command = options.command ?? getSubCommandForRequest(this)!;
	}

	public static from(
		raw: RCPMessageRaw,
		ctx: RCPMessageParsingContext,
	): SetupRadioRequest {
		const command: SetupRadioCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandRequestConstructor(command);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as SetupRadioRequest;
		}

		const ret = new SetupRadioRequest({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: SetupRadioCommand;

	public serialize(ctx: RCPMessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([[this.command], this.payload]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(SetupRadioCommand, this.command),
				payload: logBuffer(this.payload),
			},
		};
	}
}

export interface SetupRadioResponseOptions {
	command?: SetupRadioCommand;
}

@rcpMessageTypes(RCPMessageType.Response, RCPFunctionType.SetupRadio)
export class SetupRadioResponse extends RCPMessage {
	public constructor(
		options: SetupRadioResponseOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.command = options.command ?? getSubCommandForResponse(this)!;
	}

	public static from(
		raw: RCPMessageRaw,
		ctx: RCPMessageParsingContext,
	): SetupRadioResponse {
		const command: SetupRadioCommand = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getSubCommandResponseConstructor(command);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as SetupRadioResponse;
		}

		const ret = new SetupRadioResponse({
			command,
		});
		ret.payload = payload;
		return ret;
	}

	public command: SetupRadioCommand;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				command: getEnumMemberName(SetupRadioCommand, this.command),
				payload: logBuffer(this.payload),
			},
		};
	}
}

// =============================================================================

@subCommandRequest(SetupRadioCommand.GetRegion)
export class SetupRadio_GetRegionRequest extends SetupRadioRequest {}

export interface SetupRadio_GetRegionResponseOptions {
	region: RFRegion;
	channelConfig: ChannelConfiguration;
	channels: ChannelInfo[];
}

@subCommandResponse(SetupRadioCommand.GetRegion)
export class SetupRadio_GetRegionResponse extends SetupRadioResponse {
	public constructor(
		options: SetupRadio_GetRegionResponseOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
		this.channelConfig = options.channelConfig;
		this.channels = options.channels;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): SetupRadio_GetRegionResponse {
		validatePayload(raw.payload.length >= 3);
		const region: RFRegion = raw.payload[0];
		const channelConfig: ChannelConfiguration = raw.payload[1];
		const numChannels = raw.payload[2];
		// Each channel consists of a 4 byte frequency and a 1 byte data rate
		validatePayload(raw.payload.length >= 3 + numChannels * 5);
		const channels: ChannelInfo[] = [];
		for (let ch = 0; ch < numChannels; ch++) {
			const offset = 3 + ch * 5;
			const frequency = raw.payload.readUInt32BE(offset);
			// The firmware uses the RAIL enum internally, which is equivalent to ZnifferProtocolDataRate
			const dataRate = znifferProtocolDataRateToProtocolDataRate(
				raw.payload[offset + 4],
			);
			channels.push({ channel: ch, frequency, dataRate });
		}

		return new this({
			region,
			channelConfig,
			channels,
		});
	}

	public region: RFRegion;
	public channelConfig: ChannelConfiguration;
	public channels: ChannelInfo[];

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				region: getEnumMemberName(RFRegion, this.region),
				"channel config": getEnumMemberName(
					ChannelConfiguration,
					this.channelConfig,
				),
				channels: logList(this.channels.map(formatChannelInfo)),
				// The parsed fields supersede the raw payload
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

export interface SetupRadio_SetRegionOptions {
	region: RFRegion;
	channelConfig: ChannelConfiguration;
}

@subCommandRequest(SetupRadioCommand.SetRegion)
export class SetupRadio_SetRegionRequest extends SetupRadioRequest {
	public constructor(
		options: SetupRadio_SetRegionOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.region = options.region;
		this.channelConfig = options.channelConfig;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): SetupRadio_SetRegionRequest {
		const region: RFRegion = raw.payload[0];
		const channelConfig: ChannelConfiguration = raw.payload[1];

		return new this({
			region,
			channelConfig,
		});
	}

	public region: RFRegion;
	public channelConfig: ChannelConfiguration;

	public serialize(ctx: RCPMessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.from([this.region, this.channelConfig]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				region: getEnumMemberName(RFRegion, this.region),
				"channel config": getEnumMemberName(
					ChannelConfiguration,
					this.channelConfig,
				),
				// The parsed fields supersede the raw payload
				payload: undefined,
			}),
		};
	}
}

export type SetupRadio_SetRegionResponseOptions =
	| {
			success: false;
			channels?: undefined;
	  }
	| {
			success: true;
			channels: ChannelInfo[];
	  };

@subCommandResponse(SetupRadioCommand.SetRegion)
export class SetupRadio_SetRegionResponse
	extends SetupRadioResponse
	implements SuccessIndicator
{
	public constructor(
		options: SetupRadio_SetRegionResponseOptions & RCPMessageBaseOptions,
	) {
		super(options);
		this.success = options.success;
		this.channels = options.channels;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): SetupRadio_SetRegionResponse {
		const success = raw.payload[0] !== 0;
		if (!success) {
			return new this({
				success: false,
			});
		}

		validatePayload(raw.payload.length >= 2);
		const numChannels = raw.payload[1];
		// Each channel consists of a 4 byte frequency and a 1 byte data rate
		validatePayload(raw.payload.length >= 2 + numChannels * 5);
		const channels: ChannelInfo[] = [];
		for (let ch = 0; ch < numChannels; ch++) {
			const offset = 2 + ch * 5;
			const frequency = raw.payload.readUInt32BE(offset);
			// The firmware uses the RAIL enum internally, which is equivalent to ZnifferProtocolDataRate
			const dataRate = znifferProtocolDataRateToProtocolDataRate(
				raw.payload[offset + 4],
			);
			channels.push({ channel: ch, frequency, dataRate });
		}

		return new this({
			success,
			channels,
		});
	}

	isOK(): boolean {
		return this.success;
	}

	public success: boolean;
	public channels: MaybeNotKnown<ChannelInfo[]>;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				success: this.success,
				channels:
					this.channels
					&& logList(this.channels.map(formatChannelInfo)),
				// The parsed fields supersede the raw payload
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

@subCommandRequest(SetupRadioCommand.GetTxPowerRange)
export class SetupRadio_GetTxPowerRangeRequest extends SetupRadioRequest {}

export interface SetupRadio_GetTxPowerRangeResponseOptions {
	minTxPower: number;
	maxTxPower: number;
}

@subCommandResponse(SetupRadioCommand.GetTxPowerRange)
export class SetupRadio_GetTxPowerRangeResponse extends SetupRadioResponse {
	public constructor(
		options: SetupRadio_GetTxPowerRangeResponseOptions
			& RCPMessageBaseOptions,
	) {
		super(options);
		this.minTxPower = options.minTxPower;
		this.maxTxPower = options.maxTxPower;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): SetupRadio_GetTxPowerRangeResponse {
		validatePayload(raw.payload.length >= 4);
		// The firmware reports the range in deci-dBm
		const minTxPower = raw.payload.readInt16BE(0) / 10;
		const maxTxPower = raw.payload.readInt16BE(2) / 10;

		return new this({
			minTxPower,
			maxTxPower,
		});
	}

	/** The lowest supported TX power in dBm */
	public minTxPower: number;
	/** The highest supported TX power in dBm */
	public maxTxPower: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				"min. TX power": `${this.minTxPower.toFixed(1)} dBm`,
				"max. TX power": `${this.maxTxPower.toFixed(1)} dBm`,
				// The parsed fields supersede the raw payload
				payload: undefined,
			}),
		};
	}
}

// =============================================================================

@subCommandRequest(SetupRadioCommand.GetCapabilities)
export class SetupRadio_GetCapabilitiesRequest extends SetupRadioRequest {}

export interface SetupRadio_GetCapabilitiesResponseOptions {
	capabilities: RadioCapability[];
}

@subCommandResponse(SetupRadioCommand.GetCapabilities)
export class SetupRadio_GetCapabilitiesResponse extends SetupRadioResponse {
	public constructor(
		options: SetupRadio_GetCapabilitiesResponseOptions
			& RCPMessageBaseOptions,
	) {
		super(options);
		this.capabilities = options.capabilities;
	}

	public static from(
		raw: RCPMessageRaw,
		_ctx: RCPMessageParsingContext,
	): SetupRadio_GetCapabilitiesResponse {
		const bitmaskLength = raw.payload[0];
		const capabilities: RadioCapability[] = parseBitMask(
			raw.payload.subarray(1, 1 + bitmaskLength),
		);

		return new this({
			capabilities,
		});
	}

	public capabilities: RadioCapability[];

	public toLogEntry(): MessageOrCCLogEntry {
		const ret = super.toLogEntry();
		return {
			...ret,
			message: mergeLogDict(ret.message, {
				capabilities: logList(
					this.capabilities.map((c) =>
						getEnumMemberName(RadioCapability, c),
					),
				),
				// The parsed fields supersede the raw payload
				payload: undefined,
			}),
		};
	}
}
