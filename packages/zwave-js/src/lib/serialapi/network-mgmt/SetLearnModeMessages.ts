import {
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	type MessageOptions,
	MessageType,
	type SuccessIndicator,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { buffer2hex, getEnumMemberName } from "@zwave-js/shared";

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
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== SetLearnModeCallback
		) {
			return new SetLearnModeCallback(host, options);
		}
		super(host, options);
	}
}

export interface SetLearnModeRequestOptions extends MessageBaseOptions {
	intent: LearnModeIntent;
}

@expectedResponse(FunctionType.SetLearnMode)
// The callback may come much (30+ seconds), so we wait for it outside of the queue
export class SetLearnModeRequest extends SetLearnModeRequestBase {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions | SetLearnModeRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.intent = options.intent;
		}
	}

	public intent: LearnModeIntent;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		this.payload = Buffer.from([
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

@messageTypes(MessageType.Response, FunctionType.SetLearnMode)
export class SetLearnModeResponse extends Message implements SuccessIndicator {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.success = this.payload[0] !== 0;
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

export class SetLearnModeCallback extends SetLearnModeRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this.status = this.payload[1];
		this.assignedNodeId = this.payload[2];
		if (this.payload.length > 3) {
			const msgLength = this.payload[3];
			this.statusMessage = this.payload.subarray(4, 4 + msgLength);
		}
	}

	public readonly status: LearnModeStatus;
	public readonly assignedNodeId: number;
	public readonly statusMessage?: Buffer;

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
