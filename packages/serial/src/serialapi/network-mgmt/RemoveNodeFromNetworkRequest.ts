import {
	type CommandClasses,
	MessagePriority,
	encodeNodeID,
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
	MessageOrigin,
	MessageType,
	expectedCallback,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";

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
		if (ctx.origin === MessageOrigin.Host) {
			return RemoveNodeFromNetworkRequest.from(raw, ctx);
		} else {
			return RemoveNodeFromNetworkRequestStatusReport.from(raw, ctx);
		}
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

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): RemoveNodeFromNetworkRequest {
		const highPower = !!(raw.payload[0] & RemoveNodeFlags.HighPower);
		const networkWide = !!(raw.payload[0] & RemoveNodeFlags.NetworkWide);
		const removeNodeType = raw.payload[0] & 0b11111;
		const callbackId = raw.payload[1];

		return new this({
			callbackId,
			removeNodeType,
			highPower,
			networkWide,
		});
	}

	/** The type of node to remove */
	public removeNodeType: RemoveNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to exclude network wide */
	public networkWide: boolean = false;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		let data: number = this.removeNodeType || RemoveNodeType.Any;
		if (this.highPower) data |= RemoveNodeFlags.HighPower;
		if (this.networkWide) data |= RemoveNodeFlags.NetworkWide;

		this.payload = Bytes.from([data, this.callbackId]);

		return super.serialize(ctx);
	}
}

export type RemoveNodeFromNetworkRequestStatusReportOptions = {
	status:
		| RemoveNodeStatus.Ready
		| RemoveNodeStatus.NodeFound
		| RemoveNodeStatus.Failed
		| RemoveNodeStatus.Reserved_0x05
		| RemoveNodeStatus.Done;
} | {
	status:
		| RemoveNodeStatus.RemovingController
		| RemoveNodeStatus.RemovingSlave;
	nodeId: number;
};

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

		this.status = options.status;
		if ("nodeId" in options) {
			this.statusContext = { nodeId: options.nodeId };
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): RemoveNodeFromNetworkRequestStatusReport {
		const callbackId = raw.payload[0];
		const status: RemoveNodeStatus = raw.payload[1];
		switch (status) {
			case RemoveNodeStatus.Ready:
			case RemoveNodeStatus.NodeFound:
			case RemoveNodeStatus.Failed:
			case RemoveNodeStatus.Reserved_0x05:
			case RemoveNodeStatus.Done:
				// no context for the status to parse
				// TODO:
				// An application MUST time out waiting for the REMOVE_NODE_STATUS_REMOVING_SLAVE status
				// if it does not receive the indication within a 14 sec after receiving the
				// REMOVE_NODE_STATUS_NODE_FOUND status.
				return new this({
					callbackId,
					status,
				});

			case RemoveNodeStatus.RemovingController:
			case RemoveNodeStatus.RemovingSlave: {
				// the payload contains the node ID
				const { nodeId } = parseNodeID(
					raw.payload.subarray(2),
					ctx.nodeIdType,
				);
				return new this({
					callbackId,
					status,
					nodeId,
				});
			}
		}
	}

	public readonly status: RemoveNodeStatus;
	public readonly statusContext: RemoveNodeStatusContext | undefined;

	isOK(): boolean {
		// Some of the status codes are for unsolicited callbacks, but
		// Failed is the only NOK status.
		return this.status !== RemoveNodeStatus.Failed;
	}

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId, this.status]);
		if (this.statusContext?.nodeId != undefined) {
			this.payload = Bytes.concat([
				this.payload,
				encodeNodeID(this.statusContext.nodeId, ctx.nodeIdType),
			]);
		}

		return super.serialize(ctx);
	}
}

interface RemoveNodeStatusContext {
	nodeId: number;
	basic?: number;
	generic?: number;
	specific?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
