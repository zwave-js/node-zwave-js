import {
	CommandClasses,
	NodeType,
	parseNodeUpdatePayload,
} from "@zwave-js/core";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedCallback,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	messageTypes,
	priority,
} from "../message/Message";
import type { SuccessIndicator } from "../message/SuccessIndicator";

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
	driver: Driver,
	nodeType: NodeType,
): number {
	const allNodes = [...driver.controller.nodes.values()];
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
	public constructor(driver: Driver, options: MessageOptions) {
		if (
			gotDeserializationOptions(options) &&
			(new.target as any) !== AddNodeToNetworkRequestStatusReport
		) {
			return new AddNodeToNetworkRequestStatusReport(driver, options);
		}
		super(driver, options);
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
		driver: Driver,
		options: AddNodeToNetworkRequestOptions = {},
	) {
		super(driver, options);

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
}

export class AddNodeDSKToNetworkRequest extends AddNodeToNetworkRequestBase {
	public constructor(
		driver: Driver,
		options: AddNodeDSKToNetworkRequestOptions,
	) {
		super(driver, options);

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
}

export class AddNodeToNetworkRequestStatusReport
	extends AddNodeToNetworkRequestBase
	implements SuccessIndicator
{
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);
		this.callbackId = this.payload[0];
		this.status = this.payload[1];
		switch (this.status) {
			case AddNodeStatus.Ready:
			case AddNodeStatus.NodeFound:
			case AddNodeStatus.ProtocolDone:
			case AddNodeStatus.Failed:
				// no context for the status to parse
				break;

			case AddNodeStatus.Done:
				this.statusContext = { nodeId: this.payload[2] };
				break;

			case AddNodeStatus.AddingController:
			case AddNodeStatus.AddingSlave: {
				// the payload contains a node information frame
				this.statusContext = parseNodeUpdatePayload(
					this.payload.slice(2),
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
}

interface AddNodeStatusContext {
	nodeId: number;
	basic?: number;
	generic?: number;
	specific?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
