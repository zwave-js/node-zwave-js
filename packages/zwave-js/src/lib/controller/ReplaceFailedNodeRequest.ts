import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	expectedResponse,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { SuccessIndicator } from "../message/SuccessIndicator";

export enum ReplaceFailedNodeStartFlags {
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

export enum ReplaceFailedNodeStatus {
	/* ZW_ReplaceFailedNode and ZW_ReplaceFailedNode callback status definitions */
	/** The node is working properly (removed from the failed nodes list ). Replace process stopped */
	NodeOK = 0,

	/* ZW_ReplaceFailedNode callback status definitions */
	/** The failed node is ready to be replaced
        and controller is ready to add new node
        with the nodeID of the failed node.
        Meaning that the new node must now
        emit a nodeinformation frame to be
        included. */
	FailedNodeReplace = 1,
	/** The failed node has been replaced. */
	FailedNodeReplaceDone = 2,

	/** The replace process has failed */
	FailedNodeReplaceFailed = 3,
}

@messageTypes(MessageType.Request, FunctionType.ReplaceFailedNode)
@priority(MessagePriority.Controller)
export class ReplaceFailedNodeRequestBase extends Message {
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== ReplaceFailedNodeRequestStatusReport
		) {
			return new ReplaceFailedNodeRequestStatusReport(driver, options);
		}
		super(driver, options);
	}
}

interface ReplaceFailedNodeRequestOptions extends MessageBaseOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(FunctionType.ReplaceFailedNode)
@expectedCallback(FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeRequest extends ReplaceFailedNodeRequestBase {
	public constructor(
		driver: Driver,
		options: ReplaceFailedNodeRequestOptions,
	) {
		super(driver, options);
		this.failedNodeId = options.failedNodeId;
	}

	// This must not be called nodeId or rejectAllTransactions may reject the request
	/** The node that should be removed */
	public failedNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.failedNodeId, this.callbackId]);
		return super.serialize();
	}
}

export class ReplaceFailedNodeRequestStatusReport
	extends ReplaceFailedNodeRequestBase
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._replaceStatus = this.payload[1];
	}

	private _replaceStatus: ReplaceFailedNodeStatus;
	public get replaceStatus(): ReplaceFailedNodeStatus {
		return this._replaceStatus;
	}

	public isOK(): boolean {
		return (
			this._replaceStatus ===
			ReplaceFailedNodeStatus.FailedNodeReplaceDone
		);
	}
}

@messageTypes(MessageType.Response, FunctionType.ReplaceFailedNode)
export class ReplaceFailedNodeResponse
	extends Message
	implements SuccessIndicator {
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
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
