import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	MessageOrigin,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes, buffer2hex, getEnumMemberName } from "@zwave-js/shared";

const LEARN_MODE_EMPTY_NODE_ID = 0xef; // who knows why...

export enum LearnModeIntent {
	LegacyStop = 0,
	LegacyInclusionExclusion = 0x01,
	LegacyNetworkWideInclusion = 0x02,
	LegacyNetworkWideExclusion = 0x03,

	Stop = 0x80,
	// The Z-Wave API Module SHOULD try a direct range inclusion followed by 4 NWI attempts
	Inclusion = 0x81,
	DirectExclusion = 0x82,
	NetworkWideExclusion = 0x83,
	SmartStart = 0x84,
}

export enum LearnModeStatus {
	Started = 0x01,
	ProtocolDone = 0x05, // Not specified, but used in firmware
	Completed = 0x06,
	Failed = 0x07,
}

@messageTypes(MessageType.Request, FunctionType.SetLearnMode)
@priority(MessagePriority.Controller)
export class SetLearnModeRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): SetLearnModeRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return SetLearnModeRequest.from(raw, ctx);
		} else {
			return SetLearnModeCallback.from(raw, ctx);
		}
	}
}

export interface SetLearnModeRequestOptions {
	intent: LearnModeIntent;
}

@expectedResponse(FunctionType.SetLearnMode)
// The callback may come much (30+ seconds), so we wait for it outside of the queue
export class SetLearnModeRequest extends SetLearnModeRequestBase {
	public constructor(
		options: SetLearnModeRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.intent = options.intent;
	}

	public static from(
		_raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLearnModeRequest {
		throw new ZWaveError(
			`${this.name}: deserialization not implemented`,
			ZWaveErrorCodes.Deserialization_NotImplemented,
		);

		// return new SetLearnModeRequest({});
	}

	public intent: LearnModeIntent;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([
			this.intent,
			this.callbackId,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				intent: getEnumMemberName(LearnModeIntent, this.intent),
			},
		};
	}
}

export interface SetLearnModeResponseOptions {
	success: boolean;
}

@messageTypes(MessageType.Response, FunctionType.SetLearnMode)
export class SetLearnModeResponse extends Message implements SuccessIndicator {
	public constructor(
		options: SetLearnModeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.success = options.success;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLearnModeResponse {
		const success = raw.payload[0] !== 0;

		return new this({
			success,
		});
	}

	public readonly success: boolean;

	isOK(): boolean {
		return this.success;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { success: this.success },
		};
	}
}

export interface SetLearnModeCallbackOptions {
	status: LearnModeStatus;
	assignedNodeId: number;
	statusMessage?: Uint8Array;
}

export class SetLearnModeCallback extends SetLearnModeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: SetLearnModeCallbackOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.status = options.status;
		this.assignedNodeId = options.assignedNodeId;
		this.statusMessage = options.statusMessage;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): SetLearnModeCallback {
		const callbackId = raw.payload[0];
		const status: LearnModeStatus = raw.payload[1];
		const assignedNodeId = raw.payload[2];
		let statusMessage: Uint8Array | undefined;
		if (raw.payload.length > 3) {
			const msgLength = raw.payload[3];
			statusMessage = raw.payload.subarray(4, 4 + msgLength);
		}

		return new this({
			callbackId,
			status,
			assignedNodeId,
			statusMessage,
		});
	}

	public readonly status: LearnModeStatus;
	public readonly assignedNodeId: number;
	public readonly statusMessage?: Uint8Array;

	isOK(): boolean {
		return this.status !== LearnModeStatus.Failed;
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			"callback id": this.callbackId ?? "(not set)",
			status: getEnumMemberName(LearnModeStatus, this.status),
		};
		if (
			this.status !== LearnModeStatus.Started
			|| this.assignedNodeId !== LEARN_MODE_EMPTY_NODE_ID
		) {
			message["assigned node id"] = this.assignedNodeId;
		}
		if (this.statusMessage?.length) {
			message["status message"] = buffer2hex(this.statusMessage);
		}

		return {
			...super.toLogEntry(),
			message,
		};
	}
}
