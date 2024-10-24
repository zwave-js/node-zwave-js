import {
	type CommandClasses,
	MessagePriority,
	encodeNodeID,
	parseNodeID,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	MessageOrigin,
	MessageType,
	expectedCallback,
	gotDeserializationOptions,
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
		if (gotDeserializationOptions(options)) {
			if (
				options.origin === MessageOrigin.Host
				&& (new.target as any) !== RemoveNodeFromNetworkRequest
			) {
				return new RemoveNodeFromNetworkRequest(host, options);
			} else if (
				options.origin !== MessageOrigin.Host
				&& (new.target as any)
					!== RemoveNodeFromNetworkRequestStatusReport
			) {
				return new RemoveNodeFromNetworkRequestStatusReport(
					host,
					options,
				);
			}
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
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| RemoveNodeFromNetworkRequestOptions = {},
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			const config = this.payload[0];
			this.highPower = !!(config & RemoveNodeFlags.HighPower);
			this.networkWide = !!(config & RemoveNodeFlags.NetworkWide);
			this.removeNodeType = config & 0b11111;
			this.callbackId = this.payload[1];
		} else {
			this.removeNodeType = options.removeNodeType;
			this.highPower = !!options.highPower;
			this.networkWide = !!options.networkWide;
		}
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

export type RemoveNodeFromNetworkRequestStatusReportOptions = {
	status:
		| RemoveNodeStatus.Ready
		| RemoveNodeStatus.NodeFound
		| RemoveNodeStatus.Failed
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
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| (
				& RemoveNodeFromNetworkRequestStatusReportOptions
				& MessageBaseOptions
			),
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
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
				case RemoveNodeStatus.RemovingSlave: {
					// the payload contains the node ID
					const { nodeId } = parseNodeID(
						this.payload.subarray(2),
						this.host.nodeIdType,
					);
					this.statusContext = { nodeId };
					break;
				}
			}
		} else {
			this.callbackId = options.callbackId;
			this.status = options.status;
			if ("nodeId" in options) {
				this.statusContext = { nodeId: options.nodeId };
			}
		}
	}

	isOK(): boolean {
		// Some of the status codes are for unsolicited callbacks, but
		// Failed is the only NOK status.
		return this.status !== RemoveNodeStatus.Failed;
	}

	public serialize(): Buffer {
		this.payload = Buffer.from([this.callbackId, this.status]);
		if (this.statusContext?.nodeId != undefined) {
			this.payload = Buffer.concat([
				this.payload,
				encodeNodeID(this.statusContext.nodeId, this.host.nodeIdType),
			]);
		}

		return super.serialize();
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
