import { IDriver } from "../driver/IDriver";
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
	ResponseRole,
} from "../message/Message";

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

	// /* ZW_ReplaceFailedNode callback status definitions */
	// /** The failed node are ready to be replaced and controller is ready to add new node with nodeID of the failed node */
	// ZW_FAILED_NODE_REPLACE = 3,
	// /** The failed node has been replaced */
	// ZW_FAILED_NODE_REPLACE_DONE = 4,
	// /** The failed node has not been replaced */
	// ZW_FAILED_NODE_REPLACE_FAILED = 5,
}

@messageTypes(MessageType.Request, FunctionType.RemoveFailedNode)
@priority(MessagePriority.Controller)
export class RemoveFailedNodeRequestBase extends Message {
	public constructor(driver: IDriver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RemoveFailedNodeRequestStatusReport
		) {
			return new RemoveFailedNodeRequestStatusReport(driver, options);
		}
		super(driver, options);
	}
}

interface RemoveFailedNodeRequestOptions extends MessageBaseOptions {
	// This must not be called nodeId or rejectAllTransactions may reject the request
	failedNodeId: number;
}

@expectedResponse(testResponseForRemoveFailedNodeRequest)
export class RemoveFailedNodeRequest extends RemoveFailedNodeRequestBase {
	public constructor(
		driver: IDriver,
		options: RemoveFailedNodeRequestOptions,
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

export class RemoveFailedNodeRequestStatusReport extends RemoveFailedNodeRequestBase {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);

		this.callbackId = this.payload[0];
		this._removeStatus = this.payload[1];
	}

	private _removeStatus: RemoveFailedNodeStatus;
	public get removeStatus(): RemoveFailedNodeStatus {
		return this._removeStatus;
	}

	public isFailed(): boolean {
		return this._removeStatus !== RemoveFailedNodeStatus.NodeRemoved;
	}
}

@messageTypes(MessageType.Response, FunctionType.RemoveFailedNode)
export class RemoveFailedNodeResponse extends Message {
	public constructor(
		driver: IDriver,
		options: MessageDeserializationOptions,
	) {
		super(driver, options);
		this._removeStatus = this.payload[0];
	}

	private _removeStatus: RemoveFailedNodeStartFlags;
	public get removeStatus(): RemoveFailedNodeStartFlags {
		return this._removeStatus;
	}

	public get isFailed(): boolean {
		return this._removeStatus !== RemoveFailedNodeStartFlags.OK;
	}
}

// Generic handler for all potential responses to RemoveFailedNodeRequests
function testResponseForRemoveFailedNodeRequest(
	sent: RemoveFailedNodeRequest,
	received: Message,
): ResponseRole {
	// Any error responses are final, because they contain the reason that the node could not be removed
	if (received instanceof RemoveFailedNodeResponse) {
		return !received.isFailed ? "confirmation" : "final";
	} else if (received instanceof RemoveFailedNodeRequestStatusReport) {
		return "final";
	}
	return "unexpected";
}
