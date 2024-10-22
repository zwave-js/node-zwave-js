import {
	type CommandClasses,
	MessagePriority,
	parseNodeID,
} from "@zwave-js/core";
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
	MessageType,
	expectedCallback,
	messageTypes,
	priority,
} from "@zwave-js/serial";

export enum RemoveNodeType {
	Any = 1,
	Controller = 2,
	Slave = 3,
	Stop = 5,
}

export enum RemoveNodeStatus {
	Ready = 1,
	NodeFound = 2,
	RemovingSlave = 3,
	RemovingController = 4,
	// Some controllers send this value when stopping a failed exclusion
	Reserved_0x05 = 5,
	Done = 6,
	Failed = 7,
}

enum RemoveNodeFlags {
	HighPower = 0x80,
	NetworkWide = 0x40,
}

export interface RemoveNodeFromNetworkRequestOptions {
	removeNodeType?: RemoveNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.RemoveNodeFromNetwork)
// no expected response, the controller will respond with multiple RemoveNodeFromNetworkRequests
@priority(MessagePriority.Controller)
export class RemoveNodeFromNetworkRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RemoveNodeFromNetworkRequestBase {
		return RemoveNodeFromNetworkRequestStatusReport.from(raw, ctx);
	}
}

function testCallbackForRemoveNodeRequest(
	sent: RemoveNodeFromNetworkRequest,
	received: Message,
) {
	if (!(received instanceof RemoveNodeFromNetworkRequestStatusReport)) {
		return false;
	}
	switch (sent.removeNodeType) {
		case RemoveNodeType.Any:
		case RemoveNodeType.Controller:
		case RemoveNodeType.Slave:
			return (
				received.status === RemoveNodeStatus.Ready
				|| received.status === RemoveNodeStatus.Failed
			);
		case RemoveNodeType.Stop:
			return (
				received.status === RemoveNodeStatus.Done
				// This status is sent by some controllers when stopping a failed exclusion
				|| received.status === RemoveNodeStatus.Reserved_0x05
				|| received.status === RemoveNodeStatus.Failed
			);
		default:
			return false;
	}
}

@expectedCallback(testCallbackForRemoveNodeRequest)
export class RemoveNodeFromNetworkRequest
	extends RemoveNodeFromNetworkRequestBase
{
	public constructor(
		options: RemoveNodeFromNetworkRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.removeNodeType = options.removeNodeType;
		this.highPower = !!options.highPower;
		this.networkWide = !!options.networkWide;
	}

	/** The type of node to remove */
	public removeNodeType: RemoveNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to exclude network wide */
	public networkWide: boolean = false;

	public serialize(ctx: MessageEncodingContext): Buffer {
		this.assertCallbackId();
		let data: number = this.removeNodeType || RemoveNodeType.Any;
		if (this.highPower) data |= RemoveNodeFlags.HighPower;
		if (this.networkWide) data |= RemoveNodeFlags.NetworkWide;

		this.payload = Buffer.from([data, this.callbackId]);

		return super.serialize(ctx);
	}
}

export interface RemoveNodeFromNetworkRequestStatusReportOptions {
	status: RemoveNodeStatus;
	statusContext?: RemoveNodeStatusContext;
}

export class RemoveNodeFromNetworkRequestStatusReport
	extends RemoveNodeFromNetworkRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& RemoveNodeFromNetworkRequestStatusReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.callbackId = options.callbackId;
		this.status = options.status;
		this.statusContext = options.statusContext;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RemoveNodeFromNetworkRequestStatusReport {
		const callbackId = raw.payload[0];
		const status: RemoveNodeStatus = raw.payload[1];
		let statusContext: RemoveNodeStatusContext | undefined;
		switch (status) {
			case RemoveNodeStatus.Ready:
			case RemoveNodeStatus.NodeFound:
			case RemoveNodeStatus.Failed:
			case RemoveNodeStatus.Done:
				// no context for the status to parse
				// TODO:
				// An application MUST time out waiting for the REMOVE_NODE_STATUS_REMOVING_SLAVE status
				// if it does not receive the indication within a 14 sec after receiving the
				// REMOVE_NODE_STATUS_NODE_FOUND status.
				break;

			case RemoveNodeStatus.RemovingController:
			case RemoveNodeStatus.RemovingSlave: {
				// the payload contains the node ID
				const { nodeId } = parseNodeID(
					raw.payload.subarray(2),
					ctx.nodeIdType,
				);
				statusContext = { nodeId };
				break;
			}
		}

		return new RemoveNodeFromNetworkRequestStatusReport({
			callbackId,
			status,
			statusContext,
		});
	}

	isOK(): boolean {
		// Some of the status codes are for unsolicited callbacks, but
		// Failed is the only NOK status.
		return this.status !== RemoveNodeStatus.Failed;
	}

	public readonly status: RemoveNodeStatus;
	public readonly statusContext: RemoveNodeStatusContext | undefined;
}

interface RemoveNodeStatusContext {
	nodeId: number;
	basic?: number;
	generic?: number;
	specific?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
