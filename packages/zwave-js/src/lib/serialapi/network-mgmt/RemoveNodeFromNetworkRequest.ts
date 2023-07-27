import {
	MessagePriority,
	parseNodeUpdatePayload,
	type CommandClasses,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	MessageType,
	expectedCallback,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
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

interface RemoveNodeFromNetworkRequestOptions extends MessageBaseOptions {
	removeNodeType?: RemoveNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

@messageTypes(MessageType.Request, FunctionType.RemoveNodeFromNetwork)
// no expected response, the controller will respond with multiple RemoveNodeFromNetworkRequests
@priority(MessagePriority.Controller)
export class RemoveNodeFromNetworkRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== RemoveNodeFromNetworkRequestStatusReport
		) {
			return new RemoveNodeFromNetworkRequestStatusReport(host, options);
		}
		super(host, options);
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
				received.status === RemoveNodeStatus.Ready ||
				received.status === RemoveNodeStatus.Failed
			);
		case RemoveNodeType.Stop:
			return (
				received.status === RemoveNodeStatus.Done ||
				// This status is sent by some controllers when stopping a failed exclusion
				received.status === RemoveNodeStatus.Reserved_0x05 ||
				received.status === RemoveNodeStatus.Failed
			);
		default:
			return false;
	}
}

@expectedCallback(testCallbackForRemoveNodeRequest)
export class RemoveNodeFromNetworkRequest extends RemoveNodeFromNetworkRequestBase {
	public constructor(
		host: ZWaveHost,
		options: RemoveNodeFromNetworkRequestOptions = {},
	) {
		super(host, options);

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

	public serialize(): Buffer {
		let data: number = this.removeNodeType || RemoveNodeType.Any;
		if (this.highPower) data |= RemoveNodeFlags.HighPower;
		if (this.networkWide) data |= RemoveNodeFlags.NetworkWide;

		this.payload = Buffer.from([data, this.callbackId]);

		return super.serialize();
	}
}

export class RemoveNodeFromNetworkRequestStatusReport
	extends RemoveNodeFromNetworkRequestBase
	implements SuccessIndicator
{
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.callbackId = this.payload[0];
		this.status = this.payload[1];
		switch (this.status) {
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
			case RemoveNodeStatus.RemovingSlave:
				// the payload contains a node information frame
				this.statusContext = parseNodeUpdatePayload(
					this.payload.slice(2),
					this.host.nodeIdType,
				);
				break;
		}
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
