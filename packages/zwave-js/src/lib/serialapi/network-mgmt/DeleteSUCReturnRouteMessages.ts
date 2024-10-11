import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	encodeNodeID,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
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
	MessageOrigin,
	MessageType,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.DeleteSUCReturnRoute)
@priority(MessagePriority.Normal)
export class DeleteSUCReturnRouteRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (gotDeserializationOptions(options)) {
			if (
				options.origin === MessageOrigin.Host
				&& (new.target as any) !== DeleteSUCReturnRouteRequest
			) {
				return new DeleteSUCReturnRouteRequest(host, options);
			} else if (
				options.origin !== MessageOrigin.Host
				&& (new.target as any)
					!== DeleteSUCReturnRouteRequestTransmitReport
			) {
				return new DeleteSUCReturnRouteRequestTransmitReport(
					host,
					options,
				);
			}
		}

		super(host, options);
	}
}

export interface DeleteSUCReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
}

function testDeleteSUCReturnRouteCallback(
	sent: DeleteSUCReturnRouteRequest,
	callback: Message,
): boolean {
	// Some controllers have a bug where they incorrectly respond with DeleteSUCReturnRoute
	if (
		callback.host
			.getDeviceConfig?.(callback.host.ownNodeId)
			?.compat
			?.disableCallbackFunctionTypeCheck
			?.includes(FunctionType.DeleteSUCReturnRoute)
	) {
		return true;
	}
	return callback.functionType === FunctionType.DeleteSUCReturnRoute;
}

@expectedResponse(FunctionType.DeleteSUCReturnRoute)
@expectedCallback(testDeleteSUCReturnRouteCallback)
export class DeleteSUCReturnRouteRequest extends DeleteSUCReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| DeleteSUCReturnRouteRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			this.nodeId = this.payload[0];
			this.callbackId = this.payload[1];
		} else {
			this.nodeId = options.nodeId;
		}
	}

	public nodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		const nodeId = encodeNodeID(this.nodeId, this.host.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);

		return super.serialize(ctx);
	}
}

interface DeleteSUCReturnRouteResponseOptions extends MessageBaseOptions {
	wasExecuted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.DeleteSUCReturnRoute)
export class DeleteSUCReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| DeleteSUCReturnRouteResponseOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			this.wasExecuted = this.payload[0] !== 0;
		} else {
			this.wasExecuted = options.wasExecuted;
		}
	}

	public isOK(): boolean {
		return this.wasExecuted;
	}

	public readonly wasExecuted: boolean;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([this.wasExecuted ? 0x01 : 0]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: { "was executed": this.wasExecuted },
		};
	}
}

interface DeleteSUCReturnRouteRequestTransmitReportOptions
	extends MessageBaseOptions
{
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class DeleteSUCReturnRouteRequestTransmitReport
	extends DeleteSUCReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| DeleteSUCReturnRouteRequestTransmitReportOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.callbackId = this.payload[0];
			this.transmitStatus = this.payload[1];
		} else {
			this.callbackId = options.callbackId;
			this.transmitStatus = options.transmitStatus;
		}
	}

	public isOK(): boolean {
		// The other statuses are technically "not OK", but they are caused by
		// not being able to contact the node. We don't want the node to be marked
		// as dead because of that
		return this.transmitStatus !== TransmitStatus.NoAck;
	}

	public readonly transmitStatus: TransmitStatus;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.payload = Buffer.from([this.callbackId, this.transmitStatus]);
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				"callback id": this.callbackId,
				"transmit status": getEnumMemberName(
					TransmitStatus,
					this.transmitStatus,
				),
			},
		};
	}
}
