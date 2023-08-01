import {
	MessagePriority,
	NodeType,
	parseNodeID,
	parseNodeUpdatePayload,
	type CommandClasses,
	type MessageOrCCLogEntry,
	type MessageRecord,
} from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
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
import { buffer2hex, getEnumMemberName } from "@zwave-js/shared";

export enum AddNodeType {
	Any = 1,
	Controller = 2,
	Slave = 3,
	Existing = 4,
	Stop = 5,
	StopControllerReplication = 6,

	SmartStartDSK = 8,
	SmartStartListen = 9,
}

export enum AddNodeStatus {
	Ready = 1,
	NodeFound = 2,
	AddingSlave = 3,
	AddingController = 4,
	ProtocolDone = 5,
	Done = 6,
	Failed = 7,
}

enum AddNodeFlags {
	HighPower = 0x80,
	NetworkWide = 0x40,
}

interface AddNodeToNetworkRequestOptions extends MessageBaseOptions {
	addNodeType?: AddNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

interface AddNodeDSKToNetworkRequestOptions extends MessageBaseOptions {
	nwiHomeId: Buffer;
	authHomeId: Buffer;
	highPower?: boolean;
	networkWide?: boolean;
}

export function computeNeighborDiscoveryTimeout(
	host: ZWaveApplicationHost,
	nodeType: NodeType,
): number {
	const allNodes = [...host.nodes.values()];
	const numListeningNodes = allNodes.filter((n) => n.isListening).length;
	const numFlirsNodes = allNodes.filter((n) => n.isFrequentListening).length;
	const numNodes = allNodes.length;

	// According to the Appl-Programmers-Guide
	return (
		76000 +
		numListeningNodes * 217 +
		numFlirsNodes * 3517 +
		(nodeType === NodeType.Controller ? numNodes * 732 : 0)
	);
}

@messageTypes(MessageType.Request, FunctionType.AddNodeToNetwork)
// no expected response, the controller will respond with multiple AddNodeToNetworkRequests
@priority(MessagePriority.Controller)
export class AddNodeToNetworkRequestBase extends Message {
	public constructor(host: ZWaveHost, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== AddNodeToNetworkRequestStatusReport
		) {
			return new AddNodeToNetworkRequestStatusReport(host, options);
		}
		super(host, options);
	}
}

function testCallbackForAddNodeRequest(
	sent: AddNodeToNetworkRequest,
	received: Message,
) {
	if (!(received instanceof AddNodeToNetworkRequestStatusReport)) {
		return false;
	}
	switch (sent.addNodeType) {
		case AddNodeType.Any:
		case AddNodeType.Controller:
		case AddNodeType.Slave:
		case AddNodeType.Existing:
			return (
				received.status === AddNodeStatus.Ready ||
				received.status === AddNodeStatus.Failed
			);
		case AddNodeType.Stop:
		case AddNodeType.StopControllerReplication:
			return (
				received.status === AddNodeStatus.Done ||
				received.status === AddNodeStatus.Failed
			);
		default:
			return false;
	}
}

@expectedCallback(testCallbackForAddNodeRequest)
export class AddNodeToNetworkRequest extends AddNodeToNetworkRequestBase {
	public constructor(
		host: ZWaveHost,
		options: AddNodeToNetworkRequestOptions = {},
	) {
		super(host, options);

		this.addNodeType = options.addNodeType;
		this.highPower = !!options.highPower;
		this.networkWide = !!options.networkWide;
	}

	/** The type of node to add */
	public addNodeType: AddNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to include network wide */
	public networkWide: boolean = false;

	public serialize(): Buffer {
		let data: number = this.addNodeType || AddNodeType.Any;
		if (this.highPower) data |= AddNodeFlags.HighPower;
		if (this.networkWide) data |= AddNodeFlags.NetworkWide;

		this.payload = Buffer.from([data, this.callbackId]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		let message: MessageRecord;
		if (this.addNodeType === AddNodeType.Stop) {
			message = { action: "Stop" };
		} else {
			message = {
				"node type": getEnumMemberName(AddNodeType, this.addNodeType!),
			};
		}
		message = {
			...message,
			"high power": this.highPower,
			"network wide": this.networkWide,
		};

		if (this.hasCallbackId()) {
			message["callback id"] = this.callbackId;
		}
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

export class EnableSmartStartListenRequest extends AddNodeToNetworkRequestBase {
	public serialize(): Buffer {
		const control: number =
			AddNodeType.SmartStartListen | AddNodeFlags.NetworkWide;
		// The Serial API does not send a callback, so disable waiting for one
		this.callbackId = 0;

		this.payload = Buffer.from([control, this.callbackId]);
		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				action: "Enable Smart Start listening mode",
			},
		};
	}
}

export class AddNodeDSKToNetworkRequest extends AddNodeToNetworkRequestBase {
	public constructor(
		host: ZWaveHost,
		options: AddNodeDSKToNetworkRequestOptions,
	) {
		super(host, options);

		this.nwiHomeId = options.nwiHomeId;
		this.authHomeId = options.authHomeId;
		this.highPower = !!options.highPower;
		this.networkWide = !!options.networkWide;
	}

	/** The home IDs of node to add */
	public nwiHomeId: Buffer;
	public authHomeId: Buffer;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to include network wide */
	public networkWide: boolean = false;

	public serialize(): Buffer {
		let control: number = AddNodeType.SmartStartDSK;
		if (this.highPower) control |= AddNodeFlags.HighPower;
		if (this.networkWide) control |= AddNodeFlags.NetworkWide;

		this.payload = Buffer.concat([
			Buffer.from([control, this.callbackId]),
			this.nwiHomeId,
			this.authHomeId,
		]);

		return super.serialize();
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			action: "Add Smart Start node",
			"NWI Home ID": buffer2hex(this.nwiHomeId),
			"high power": this.highPower,
			"network wide": this.networkWide,
		};
		if (this.hasCallbackId()) {
			message["callback id"] = this.callbackId;
		}

		return {
			...super.toLogEntry(),
			message,
		};
	}
}

export class AddNodeToNetworkRequestStatusReport
	extends AddNodeToNetworkRequestBase
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
			case AddNodeStatus.Ready:
			case AddNodeStatus.NodeFound:
			case AddNodeStatus.ProtocolDone:
			case AddNodeStatus.Failed:
				// no context for the status to parse
				break;

			case AddNodeStatus.Done: {
				const { nodeId } = parseNodeID(
					this.payload,
					host.nodeIdType,
					2,
				);
				this.statusContext = { nodeId };
				break;
			}

			case AddNodeStatus.AddingController:
			case AddNodeStatus.AddingSlave: {
				// the payload contains a node information frame
				this.statusContext = parseNodeUpdatePayload(
					this.payload.slice(2),
					host.nodeIdType,
				);
				break;
			}
		}
	}

	isOK(): boolean {
		// Some of the status codes are for unsolicited callbacks, but
		// Failed is the only NOK status.
		return this.status !== AddNodeStatus.Failed;
	}

	public readonly status: AddNodeStatus;
	public readonly statusContext: AddNodeStatusContext | undefined;

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				status: getEnumMemberName(AddNodeStatus, this.status),
				"callback id": this.callbackId,
			},
		};
	}
}

interface AddNodeStatusContext {
	nodeId: number;
	basicDeviceClass?: number;
	genericDeviceClass?: number;
	specificDeviceClass?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
