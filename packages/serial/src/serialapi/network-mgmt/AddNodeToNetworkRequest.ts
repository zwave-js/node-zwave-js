import {
	type BasicDeviceClass,
	type CommandClasses,
	type GetAllNodes,
	type ListenBehavior,
	type MessageOrCCLogEntry,
	MessagePriority,
	type MessageRecord,
	type NodeId,
	NodeType,
	type NodeUpdatePayload,
	Protocols,
	encodeNodeUpdatePayload,
	isLongRangeNodeId,
	parseNodeID,
	parseNodeUpdatePayload,
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
import { Bytes, buffer2hex, getEnumMemberName } from "@zwave-js/shared";

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
	ProtocolLongRange = 0x20,
}

export interface AddNodeToNetworkRequestOptions {
	addNodeType?: AddNodeType;
	highPower?: boolean;
	networkWide?: boolean;
}

export interface AddNodeDSKToNetworkRequestOptions {
	nwiHomeId: Uint8Array;
	authHomeId: Uint8Array;
	highPower?: boolean;
	networkWide?: boolean;
	protocol?: Protocols;
}

export function computeNeighborDiscoveryTimeout(
	host: GetAllNodes<NodeId & ListenBehavior>,
	nodeType: NodeType,
): number {
	const allNodes = host.getAllNodes().filter((n) => !isLongRangeNodeId(n.id));
	const numListeningNodes = allNodes.filter((n) => n.isListening).length;
	const numFlirsNodes = allNodes.filter((n) => n.isFrequentListening).length;
	const numNodes = allNodes.length;

	// According to the Appl-Programmers-Guide
	return (
		76000
		+ numListeningNodes * 217
		+ numFlirsNodes * 3517
		+ (nodeType === NodeType.Controller ? numNodes * 732 : 0)
	);
}

@messageTypes(MessageType.Request, FunctionType.AddNodeToNetwork)
// no expected response, the controller will respond with multiple AddNodeToNetworkRequests
@priority(MessagePriority.Controller)
export class AddNodeToNetworkRequestBase extends Message {
	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AddNodeToNetworkRequestBase {
		if (ctx.origin === MessageOrigin.Host) {
			return AddNodeToNetworkRequest.from(raw, ctx);
		} else {
			return AddNodeToNetworkRequestStatusReport.from(raw, ctx);
		}
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
				received.status === AddNodeStatus.Ready
				|| received.status === AddNodeStatus.Failed
			);
		case AddNodeType.Stop:
		case AddNodeType.StopControllerReplication:
			return (
				received.status === AddNodeStatus.Done
				|| received.status === AddNodeStatus.Failed
			);
		default:
			return false;
	}
}

@expectedCallback(testCallbackForAddNodeRequest)
export class AddNodeToNetworkRequest extends AddNodeToNetworkRequestBase {
	public constructor(
		options: AddNodeToNetworkRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.addNodeType = options.addNodeType;
		this.highPower = !!options.highPower;
		this.networkWide = !!options.networkWide;
	}

	public static from(
		raw: MessageRaw,
		_ctx: MessageParsingContext,
	): AddNodeToNetworkRequest {
		const highPower = !!(raw.payload[0] & AddNodeFlags.HighPower);
		const networkWide = !!(raw.payload[0] & AddNodeFlags.NetworkWide);
		const addNodeType = raw.payload[0] & 0b1111;
		const callbackId = raw.payload[1];

		return new this({
			callbackId,
			addNodeType,
			highPower,
			networkWide,
		});
	}

	/** The type of node to add */
	public addNodeType: AddNodeType | undefined;
	/** Whether to use high power */
	public highPower: boolean = false;
	/** Whether to include network wide */
	public networkWide: boolean = false;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		let data: number = this.addNodeType || AddNodeType.Any;
		if (this.highPower) data |= AddNodeFlags.HighPower;
		if (this.networkWide) data |= AddNodeFlags.NetworkWide;

		this.payload = Bytes.from([data, this.callbackId]);

		return super.serialize(ctx);
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
	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		const control: number = AddNodeType.SmartStartListen
			| AddNodeFlags.NetworkWide;
		// The Serial API does not send a callback, so disable waiting for one
		this.callbackId = 0;

		this.payload = Bytes.from([control, this.callbackId]);
		return super.serialize(ctx);
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
		options: AddNodeDSKToNetworkRequestOptions & MessageBaseOptions,
	) {
		super(options);

		this.nwiHomeId = options.nwiHomeId;
		this.authHomeId = options.authHomeId;
		this.highPower = !!options.highPower;
		this.networkWide = !!options.networkWide;
		this.protocol = options.protocol ?? Protocols.ZWave;
	}

	/** The home IDs of node to add */
	public nwiHomeId: Uint8Array;
	public authHomeId: Uint8Array;
	/** Whether to use high power */
	public highPower: boolean;
	/** Whether to include network wide */
	public networkWide: boolean;
	/** Whether to include as long-range or not */
	public protocol: Protocols;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		let control: number = AddNodeType.SmartStartDSK;
		if (this.highPower) control |= AddNodeFlags.HighPower;
		if (this.networkWide) control |= AddNodeFlags.NetworkWide;
		if (this.protocol === Protocols.ZWaveLongRange) {
			control |= AddNodeFlags.ProtocolLongRange;
		}

		this.payload = Bytes.concat([
			Bytes.from([control, this.callbackId]),
			this.nwiHomeId,
			this.authHomeId,
		]);

		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			action: "Add Smart Start node",
			"NWI Home ID": buffer2hex(this.nwiHomeId),
			"high power": this.highPower,
			"network wide": this.networkWide,
			protocol: this.protocol === Protocols.ZWaveLongRange
				? "Z-Wave Long Range"
				: "Z-Wave Classic",
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

export type AddNodeToNetworkRequestStatusReportOptions = {
	status:
		| AddNodeStatus.Ready
		| AddNodeStatus.NodeFound
		| AddNodeStatus.ProtocolDone
		| AddNodeStatus.Failed;
} | {
	status: AddNodeStatus.Done;
	nodeId: number;
} | {
	status: AddNodeStatus.AddingController | AddNodeStatus.AddingSlave;
	nodeInfo: NodeUpdatePayload;
};

export class AddNodeToNetworkRequestStatusReport
	extends AddNodeToNetworkRequestBase
	implements SuccessIndicator
{
	public constructor(
		options:
			& AddNodeToNetworkRequestStatusReportOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.status = options.status;
		if ("nodeId" in options) {
			this.statusContext = { nodeId: options.nodeId };
		} else if ("nodeInfo" in options) {
			this.statusContext = options.nodeInfo;
		}
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): AddNodeToNetworkRequestStatusReport {
		const callbackId = raw.payload[0];
		const status: AddNodeStatus = raw.payload[1];
		switch (status) {
			case AddNodeStatus.Ready:
			case AddNodeStatus.NodeFound:
			case AddNodeStatus.ProtocolDone:
			case AddNodeStatus.Failed:
				// no context for the status to parse
				return new this({
					callbackId,
					status,
				});

			case AddNodeStatus.Done: {
				const { nodeId } = parseNodeID(
					raw.payload,
					ctx.nodeIdType,
					2,
				);
				return new this({
					callbackId,
					status,
					nodeId,
				});
			}

			case AddNodeStatus.AddingController:
			case AddNodeStatus.AddingSlave: {
				// the payload contains a node information frame
				const nodeInfo = parseNodeUpdatePayload(
					raw.payload.subarray(2),
					ctx.nodeIdType,
				);
				return new this({
					callbackId,
					status,
					nodeInfo,
				});
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

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.assertCallbackId();
		this.payload = Bytes.from([this.callbackId, this.status]);
		if (this.statusContext?.basicDeviceClass != undefined) {
			this.payload = Bytes.concat([
				this.payload,
				encodeNodeUpdatePayload(
					this.statusContext as NodeUpdatePayload,
					ctx.nodeIdType,
				),
			]);
		}
		return super.serialize(ctx);
	}

	public toLogEntry(): MessageOrCCLogEntry {
		return {
			...super.toLogEntry(),
			message: {
				status: getEnumMemberName(AddNodeStatus, this.status),
				"callback id": this.callbackId ?? "(not set)",
			},
		};
	}
}

export interface AddNodeStatusContext {
	nodeId: number;
	basicDeviceClass?: BasicDeviceClass;
	genericDeviceClass?: number;
	specificDeviceClass?: number;
	supportedCCs?: CommandClasses[];
	controlledCCs?: CommandClasses[];
}
