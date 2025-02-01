import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import type {
	MessageEncodingContext,
	MessageParsingContext,
	MessageRaw,
	SuccessIndicator,
} from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	MessageOrigin,
	MessageType,
	expectedCallback,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";

export enum RemoveFailedNodeStartFlags {
	OK = 0,
	/** The removing process was aborted because the controller  is not the primary one */
	NotPrimaryController = 1 << 1,
	/** The removing process was aborted because no call back function is used */
	NoCallbackFunction = 1 << 2,
	/** The removing process aborted because the node was node found */
	NodeNotFound = 1 << 3,
	/** The removing process is busy */
	RemoveProcessBusy = 1 << 4,
	/** The removing process could not be started*/
	RemoveFailed = 1 << 5,
}

export enum RemoveFailedNodeStatus {
	/* ZW_RemoveFailedNode and ZW_ReplaceFailedNode callback status definitions */
	/** The node is working properly (removed from the failed nodes list ) */
	NodeOK = 0,

	/* ZW_RemoveFailedNode callback status definitions */
	/** The failed node was removed from the failed nodes list */
	NodeRemoved = 1,
	/** The failed node was not removed from the failing nodes list */
	NodeNotRemoved = 2,
}

@messageTypes(MessageType.Request, FunctionType.RemoveFailedNode)
@priority(MessagePriority.Controller)
export class RemoveFailedNodeRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RemoveFailedNodeRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return RemoveFailedNodeRequest.from(raw, ctx);
		} else {
			return RemoveFailedNodeRequestStatusReport.from(raw, ctx);
		}
	}
}

export interface RemoveFailedNodeRequestOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(FunctionType.RemoveFailedNode)
@expectedCallback(FunctionType.RemoveFailedNode)
export class RemoveFailedNodeRequest extends RemoveFailedNodeRequestBase {
	public constructor(
		options: RemoveFailedNodeRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	/** The node that should be removed */
	public failedNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.failedNodeId, ctx.nodeIdType);
		this.payload = Bytes.concat([nodeId, Bytes.from([this.callbackId])]);
		return super.serialize(ctx);
	}
}

export interface RemoveFailedNodeRequestStatusReportOptions {
	removeStatus: RemoveFailedNodeStatus;
}

export class RemoveFailedNodeRequestStatusReport
	extends RemoveFailedNodeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& RemoveFailedNodeRequestStatusReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.removeStatus = options.removeStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RemoveFailedNodeRequestStatusReport {
		const callbackId = raw.payload[0];
		const removeStatus: RemoveFailedNodeStatus = raw.payload[1];

		return new this({
			callbackId,
			removeStatus,
		});
	}

	public removeStatus: RemoveFailedNodeStatus;

	public isOK(): boolean {
		return this.removeStatus === RemoveFailedNodeStatus.NodeRemoved;
	}
}

export interface RemoveFailedNodeResponseOptions {
	removeStatus: RemoveFailedNodeStartFlags;
}

@messageTypes(MessageType.Response, FunctionType.RemoveFailedNode)
export class RemoveFailedNodeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: RemoveFailedNodeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.removeStatus = options.removeStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RemoveFailedNodeResponse {
		const removeStatus: RemoveFailedNodeStartFlags = raw.payload[0];

		return new this({
			removeStatus,
		});
	}

	public removeStatus: RemoveFailedNodeStartFlags;

	public isOK(): boolean {
		return this.removeStatus === RemoveFailedNodeStartFlags.OK;
	}
}
