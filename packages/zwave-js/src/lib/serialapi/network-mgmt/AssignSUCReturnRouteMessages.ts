import {
	type MessageOrCCLogEntry,
	MessagePriority,
	TransmitStatus,
	encodeNodeID,
} from "@zwave-js/core";
import {
	FunctionType,
	type INodeQuery,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageEncodingContext,
	type MessageOptions,
	MessageOrigin,
	MessageType,
	type SuccessIndicator,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { getEnumMemberName } from "@zwave-js/shared";

@messageTypes(MessageType.Request, FunctionType.AssignSUCReturnRoute)
@priority(MessagePriority.Normal)
export class AssignSUCReturnRouteRequestBase extends Message {
	public constructor(options: MessageOptions) {
		if (gotDeserializationOptions(options)) {
			if (
				options.origin === MessageOrigin.Host
				&& (new.target as any) !== AssignSUCReturnRouteRequest
			) {
				return new AssignSUCReturnRouteRequest(options);
			} else if (
				options.origin !== MessageOrigin.Host
				&& (new.target as any)
					!== AssignSUCReturnRouteRequestTransmitReport
			) {
				return new AssignSUCReturnRouteRequestTransmitReport(options);
			}
		}

		super(options);
	}
}

export interface AssignSUCReturnRouteRequestOptions extends MessageBaseOptions {
	nodeId: number;
	disableCallbackFunctionTypeCheck?: boolean;
}

function testAssignSUCReturnRouteCallback(
	sent: AssignSUCReturnRouteRequest,
	callback: Message,
): boolean {
	// Some controllers have a bug where they incorrectly respond with DeleteSUCReturnRoute
	if (sent.disableCallbackFunctionTypeCheck) {
		return true;
	}
	return callback.functionType === FunctionType.AssignSUCReturnRoute;
}

@expectedResponse(FunctionType.AssignSUCReturnRoute)
@expectedCallback(testAssignSUCReturnRouteCallback)
export class AssignSUCReturnRouteRequest extends AssignSUCReturnRouteRequestBase
	implements INodeQuery
{
	public constructor(
		options:
			| MessageDeserializationOptions
			| AssignSUCReturnRouteRequestOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.nodeId = this.payload[0];
			this.callbackId = this.payload[1];
		} else {
			this.nodeId = options.nodeId;
			this.disableCallbackFunctionTypeCheck =
				options.disableCallbackFunctionTypeCheck;
		}
	}

	public nodeId: number;
	public readonly disableCallbackFunctionTypeCheck?: boolean;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.nodeId, ctx.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);

		return super.serialize(ctx);
	}
}

interface AssignSUCReturnRouteResponseOptions extends MessageBaseOptions {
	wasExecuted: boolean;
}

@messageTypes(MessageType.Response, FunctionType.AssignSUCReturnRoute)
export class AssignSUCReturnRouteResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options:
			| MessageDeserializationOptions
			| AssignSUCReturnRouteResponseOptions,
	) {
		super(options);
		if (gotDeserializationOptions(options)) {
			this.wasExecuted = this.payload[0] !== 0;
		} else {
			this.wasExecuted = options.wasExecuted;
		}
	}

	public isOK(): boolean {
		return this.wasExecuted;
	}

	public wasExecuted: boolean;

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

interface AssignSUCReturnRouteRequestTransmitReportOptions
	extends MessageBaseOptions
{
	transmitStatus: TransmitStatus;
	callbackId: number;
}

export class AssignSUCReturnRouteRequestTransmitReport
	extends AssignSUCReturnRouteRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			| MessageDeserializationOptions
			| AssignSUCReturnRouteRequestTransmitReportOptions,
	) {
		super(options);

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

	public transmitStatus: TransmitStatus;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		this.payload = Buffer.from([this.callbackId, this.transmitStatus]);
		return super.serialize(ctx);
	}

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
