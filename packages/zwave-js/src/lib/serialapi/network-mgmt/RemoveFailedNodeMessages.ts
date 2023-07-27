import { MessagePriority, encodeNodeID } from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	MessageType,
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
} from "@zwave-js/serial";

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
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RemoveFailedNodeRequestStatusReport
		) {
			return new RemoveFailedNodeRequestStatusReport(host, options);
		}
		super(host, options);
	}
}

interface RemoveFailedNodeRequestOptions extends MessageBaseOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(FunctionType.RemoveFailedNode)
@expectedCallback(FunctionType.RemoveFailedNode)
export class RemoveFailedNodeRequest extends RemoveFailedNodeRequestBase {
	public constructor(
		host: ZWaveHost,
		options: RemoveFailedNodeRequestOptions,
	) {
		super(host, options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	/** The node that should be removed */
	public failedNodeId: number;

	public serialize(): Buffer {
		const nodeId = encodeNodeID(this.failedNodeId, this.host.nodeIdType);
		this.payload = Buffer.concat([nodeId, Buffer.from([this.callbackId])]);
		return super.serialize();
	}
}

export class RemoveFailedNodeRequestStatusReport
	extends RemoveFailedNodeRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		this.callbackId = this.payload[0];
		this._removeStatus = this.payload[1];
	}

	private _removeStatus: RemoveFailedNodeStatus;
	public get removeStatus(): RemoveFailedNodeStatus {
		return this._removeStatus;
	}

	public isOK(): boolean {
		return this._removeStatus === RemoveFailedNodeStatus.NodeRemoved;
	}
}

@messageTypes(MessageType.Response, FunctionType.RemoveFailedNode)
export class RemoveFailedNodeResponse
	extends Message
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._removeStatus = this.payload[0];
	}

	private _removeStatus: RemoveFailedNodeStartFlags;
	public get removeStatus(): RemoveFailedNodeStartFlags {
		return this._removeStatus;
	}

	public isOK(): boolean {
		return this._removeStatus === RemoveFailedNodeStartFlags.OK;
	}
}
