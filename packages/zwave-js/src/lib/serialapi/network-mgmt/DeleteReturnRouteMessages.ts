import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	ZWaveError,
	ZWaveErrorCodes,
	encodeNodeID,
} from "@zwave-js/core";
import type {
	INodeQuery,
	MessageEncodingContext,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	MessageType,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.DeleteReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteReturnRouteRequestBase extends Message {
	public constructor(options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== DeleteReturnRouteRequestTransmitReport
		) {
			return new DeleteReturnRouteRequestTransmitReport(options);
		}
		super(options);
	}
}

export interface DeleteReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

@expectedResponse(FunctionType.DeleteReturnRoute)
@expectedCallback(FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteRequest extends DeleteReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		options:
			| MessageDeserializationOptions
			| DeleteReturnRouteRequestOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			throw new ZWaveError(
				`${this.constructor.name}: deserialization not implemented`,
				ZWaveErrorCodes.Deserialization_NotImplemented,
			);
		} else {
			this.nodeId = options.nodeId;
		}
	}

	public nodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);

		return super.serialize(ctx);
	}
}

@messageTypes(MessageType.Response, FunctionType.DeleteReturnRoute)
export class DeleteReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this.hasStarted = this.payload[0] !== 0;
	}

	public isOK(): boolean {
		return this.hasStarted;
	}

	public readonly hasStarted: boolean;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "has started": this.hasStarted },
		};
	}
}

export class DeleteReturnRouteRequestTransmitReport
	extends DeleteReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);

		this.callbackId = this.payload[0];
		this.transmitStatus = this.payload[1];
	}

	public isOK(): boolean {
		// The other statuses are technically "not OK", but they are caused by
		// not being able to contact the node. We don't want the node to be marked
		// as dead because of that
		return this.transmitStatus !== TransmitStatus.NoAck;
	}

	public readonly transmitStatus: TransmitStatus;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId ?? "(not set)",
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}
