import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import type {
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
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
} from "@zwave-js/serial";

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
	public constructor(options: MessageOptions) {
		if (
			gotDeserializationOptions(options)
			&& (new.target as any) !== ReplaceFailedNodeRequestStatusReport
		) {
			return new ReplaceFailedNodeRequestStatusReport(options);
		}
		super(options);
	}
}

interface ReplaceFailedNodeRequestOptions extends MessageBaseOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeRequest extends ReplaceFailedNodeRequestBase {
	public constructor(
		options: ReplaceFailedNodeRequestOptions,
	) {
		super(options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	/** The node that should be removed */
	public failedNodeId: number;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		const nodeId = encodeNodeID(this.failedNodeId, ctx.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);
		return super.serialize(ctx);
	}
}

@messageTypes(MessageType.Response, FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeResponse extends Message
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);
		this._replaceStatus = this.payload[0];
	}

	private _replaceStatus: ReplaceFailedNodeStartFlags;
	public get replaceStatus(): ReplaceFailedNodeStartFlags {
		return this._replaceStatus;
	}

	public isOK(): boolean {
		return this._replaceStatus === ReplaceFailedNodeStartFlags.OK;
	}
}

export class ReplaceFailedNodeRequestStatusReport
	extends ReplaceFailedNodeRequestBase
	implements SuccessIndicator
{
	public constructor(
		options: MessageDeserializationOptions,
	) {
		super(options);

		this.callbackId = this.payload[0];
		this._replaceStatus = this.payload[1];
	}

	private _replaceStatus: ReplaceFailedNodeStatus;
	public get replaceStatus(): ReplaceFailedNodeStatus {
		return this._replaceStatus;
	}

	public isOK(): boolean {
		return (
			this._replaceStatus
				=== ReplaceFailedNodeStatus.FailedNodeReplaceDone
		);
	}
}
