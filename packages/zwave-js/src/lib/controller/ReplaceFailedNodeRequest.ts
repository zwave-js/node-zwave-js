import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
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
	NodeOK = 0 /* The node is working properly (removed from the failed nodes list ) */,

	FailedNodeRemoved = 1 /* The failed node was removed from the failed nodes list */,
	FailedNodeNotRemoved = 2 /* The failed node was not removed from the failing nodes list */,

	FailedNodeReplace = 3 /* The failed node are ready to be replaced and controller */,
	/* is ready to add new node with nodeID of the failed node */
	/** The failed node has been replaced. */
	FailedNodeReplaceDone = 4 /* The failed node has been replaced */,

	FailedNodeReplaceFailed = 5 /* The failed node has not been replaced */,
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

	// These two properties are only set if we parse a response
	private _status: ReplaceFailedNodeStatus | undefined;
	public get status(): ReplaceFailedNodeStatus | undefined {
		return this._status;
	}

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
