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
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";

export enum ReplaceFailedNodeStartFlags {
	OK = 0,
	/** The replacing process was aborted because the controller  is not the primary one */
	NotPrimaryController = 1 << 1,
	/** The replacing process was aborted because no call back function is used */
	NoCallbackFunction = 1 << 2,
	/** The replacing process aborted because the node was node found */
	NodeNotFound = 1 << 3,
	/** The replacing process is busy */
	ReplaceProcessBusy = 1 << 4,
	/** The replacing process could not be started*/
	ReplaceFailed = 1 << 5,
}

export enum ReplaceFailedNodeStatus {
	/* ZW_ReplaceFailedNode callback status definitions */
	NodeOK =
		0, /* The node cannot be replaced because it is working properly (removed from the failed nodes list ) */

	/** The failed node is ready to be replaced and controller is ready to add new node with the nodeID of the failed node. */
	FailedNodeReplace = 3,
	/** The failed node has been replaced. */
	FailedNodeReplaceDone = 4,
	/** The failed node has not been replaced */
	FailedNodeReplaceFailed = 5,
}

@messageTypes(MessageType.Request, FunctionType.ReplaceFailedNode)
@priority(MessagePriority.Controller)
export class ReplaceFailedNodeRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ReplaceFailedNodeRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return ReplaceFailedNodeRequest.from(raw, ctx);
		} else {
			return ReplaceFailedNodeRequestStatusReport.from(raw, ctx);
		}
	}
}

export interface ReplaceFailedNodeRequestOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeRequest extends ReplaceFailedNodeRequestBase {
	public constructor(
		options: ReplaceFailedNodeRequestOptions & MessageBaseOptions,
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

export interface ReplaceFailedNodeResponseOptions {
	replaceStatus: ReplaceFailedNodeStartFlags;
}

@messageTypes(MessageType.Response, FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: ReplaceFailedNodeResponseOptions & MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.replaceStatus = options.replaceStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ReplaceFailedNodeResponse {
		const replaceStatus: ReplaceFailedNodeStartFlags = raw.payload[0];

		return new this({
			replaceStatus,
		});
	}

	public replaceStatus: ReplaceFailedNodeStartFlags;

	public isOK(): boolean {
		return this.replaceStatus === ReplaceFailedNodeStartFlags.OK;
	}
}

export interface ReplaceFailedNodeRequestStatusReportOptions {
	replaceStatus: ReplaceFailedNodeStatus;
}

export class ReplaceFailedNodeRequestStatusReport
	extends ReplaceFailedNodeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& ReplaceFailedNodeRequestStatusReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.replaceStatus = options.replaceStatus;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): ReplaceFailedNodeRequestStatusReport {
		const callbackId = raw.payload[0];
		const replaceStatus: ReplaceFailedNodeStatus = raw.payload[1];

		return new this({
			callbackId,
			replaceStatus,
		});
	}

	public replaceStatus: ReplaceFailedNodeStatus;

	public isOK(): boolean {
		return (
			this.replaceStatus
				=== ReplaceFailedNodeStatus.FailedNodeReplaceDone
		);
	}
}
