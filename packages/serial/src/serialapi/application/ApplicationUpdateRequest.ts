import {
	BasicDeviceClass,
	type CommandClasses,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type NodeUpdatePayload,
	encodeNodeUpdatePayload,
	getCCName,
	parseCCList,
	parseNodeID,
	parseNodeUpdatePayload,
} from "@zwave-js/core";
import { createSimpleReflectionDecorator } from "@zwave-js/core/reflection";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageConstructor,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	type SuccessIndicator,
	messageTypes,
} from "@zwave-js/serial";
import { Bytes, buffer2hex, getEnumMemberName } from "@zwave-js/shared";

export enum ApplicationUpdateTypes {
	SmartStart_NodeInfo_Received = 0x86, // An included smart start node has been powered up
	SmartStart_HomeId_Received = 0x85, // A smart start node requests inclusion
	SmartStart_LongRange_HomeId_Received = 0x87, // A smart start long range note requests inclusion
	NodeInfo_Received = 0x84,
	NodeInfo_RequestDone = 0x82,
	NodeInfo_RequestFailed = 0x81,
	RoutingPending = 0x80,
	Node_Added = 0x40, // A new node was added to the network by another controller
	Node_Removed = 0x20, // A new node was removed from the network by another controller
	SUC_IdChanged = 0x10,
}

const {
	decorator: applicationUpdateType,
	lookupConstructor: getApplicationUpdateRequestConstructor,
	lookupValue: getApplicationUpdateType,
} = createSimpleReflectionDecorator<
	typeof ApplicationUpdateRequest,
	[updateType: ApplicationUpdateTypes],
	MessageConstructor<ApplicationUpdateRequest>
>({
	name: "applicationUpdateType",
});

export interface ApplicationUpdateRequestOptions {
	updateType?: ApplicationUpdateTypes;
}

@messageTypes(MessageType.Request, FunctionType.ApplicationUpdateRequest)
// this is only received, not sent!
export class ApplicationUpdateRequest extends Message {
	public constructor(
		options: ApplicationUpdateRequestOptions & MessageBaseOptions = {},
	) {
		super(options);

		this.updateType = options.updateType ?? getApplicationUpdateType(this)!;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationUpdateRequest {
		const updateType: ApplicationUpdateTypes = raw.payload[0];
		const payload = raw.payload.subarray(1);

		const CommandConstructor = getApplicationUpdateRequestConstructor(
			updateType,
		);
		if (CommandConstructor) {
			return CommandConstructor.from(
				raw.withPayload(payload),
				ctx,
			) as ApplicationUpdateRequest;
		}

		const ret = new ApplicationUpdateRequest({
			updateType,
		});
		ret.payload = payload;
		return ret;
	}

	public readonly updateType: ApplicationUpdateTypes;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = Bytes.concat([
			Bytes.from([this.updateType]),
			this.payload,
		]);
		return super.serialize(ctx);
	}
}

export interface ApplicationUpdateRequestWithNodeInfoOptions {
	nodeInformation: NodeUpdatePayload;
}

export class ApplicationUpdateRequestWithNodeInfo
	extends ApplicationUpdateRequest
{
	public constructor(
		options:
			& ApplicationUpdateRequestWithNodeInfoOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.nodeId = options.nodeInformation.nodeId;
		this.nodeInformation = options.nodeInformation;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationUpdateRequestWithNodeInfo {
		const nodeInformation: NodeUpdatePayload = parseNodeUpdatePayload(
			raw.payload,
			ctx.nodeIdType,
		);

		return new this({
			nodeInformation,
		});
	}

	public nodeId: number;
	public nodeInformation: NodeUpdatePayload;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeUpdatePayload(
			this.nodeInformation,
			ctx.nodeIdType,
		);
		return super.serialize(ctx);
	}
}

@applicationUpdateType(ApplicationUpdateTypes.NodeInfo_Received)
export class ApplicationUpdateRequestNodeInfoReceived
	extends ApplicationUpdateRequestWithNodeInfo
{}

@applicationUpdateType(ApplicationUpdateTypes.NodeInfo_RequestFailed)
export class ApplicationUpdateRequestNodeInfoRequestFailed
	extends ApplicationUpdateRequest
	implements SuccessIndicator
{
	isOK(): boolean {
		return false;
	}
}

@applicationUpdateType(ApplicationUpdateTypes.Node_Added)
export class ApplicationUpdateRequestNodeAdded
	extends ApplicationUpdateRequestWithNodeInfo
{}

export interface ApplicationUpdateRequestNodeRemovedOptions {
	nodeId: number;
}

@applicationUpdateType(ApplicationUpdateTypes.Node_Removed)
export class ApplicationUpdateRequestNodeRemoved
	extends ApplicationUpdateRequest
{
	public constructor(
		options:
			& ApplicationUpdateRequestNodeRemovedOptions
			& MessageBaseOptions,
	) {
		super(options);
		this.nodeId = options.nodeId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationUpdateRequestNodeRemoved {
		const { nodeId } = parseNodeID(raw.payload, ctx.nodeIdType, 0);
		// byte 1/2 is 0, meaning unknown

		return new this({
			nodeId,
		});
	}

	public nodeId: number;
}

export interface ApplicationUpdateRequestSmartStartHomeIDReceivedBaseOptions {
	remoteNodeId: number;
	nwiHomeId: Uint8Array;
	basicDeviceClass: BasicDeviceClass;
	genericDeviceClass: number;
	specificDeviceClass: number;
	supportedCCs: CommandClasses[];
}

class ApplicationUpdateRequestSmartStartHomeIDReceivedBase
	extends ApplicationUpdateRequest
{
	public constructor(
		options:
			& ApplicationUpdateRequestSmartStartHomeIDReceivedBaseOptions
			& MessageBaseOptions,
	) {
		super(options);

		// TODO: Check implementation:
		this.remoteNodeId = options.remoteNodeId;
		this.nwiHomeId = options.nwiHomeId;
		this.basicDeviceClass = options.basicDeviceClass;
		this.genericDeviceClass = options.genericDeviceClass;
		this.specificDeviceClass = options.specificDeviceClass;
		this.supportedCCs = options.supportedCCs;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationUpdateRequestSmartStartHomeIDReceivedBase {
		let offset = 0;
		const { nodeId: remoteNodeId, bytesRead: nodeIdBytes } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		// next byte is rxStatus
		offset++;
		const nwiHomeId = raw.payload.subarray(offset, offset + 4);
		offset += 4;
		const ccLength = raw.payload[offset++];
		const basicDeviceClass: BasicDeviceClass = raw.payload[offset++];
		const genericDeviceClass = raw.payload[offset++];
		const specificDeviceClass = raw.payload[offset++];
		const supportedCCs = parseCCList(
			raw.payload.subarray(offset, offset + ccLength),
		).supportedCCs;

		return new this({
			remoteNodeId,
			nwiHomeId,
			basicDeviceClass,
			genericDeviceClass,
			specificDeviceClass,
			supportedCCs,
		});
	}

	public readonly remoteNodeId: number;
	public readonly nwiHomeId: Uint8Array;

	public readonly basicDeviceClass: BasicDeviceClass;
	public readonly genericDeviceClass: number;
	public readonly specificDeviceClass: number;
	public readonly supportedCCs: readonly CommandClasses[];

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			type: getEnumMemberName(ApplicationUpdateTypes, this.updateType),
			"remote node ID": this.remoteNodeId,
			"NWI home ID": buffer2hex(this.nwiHomeId),
			"basic device class": getEnumMemberName(
				BasicDeviceClass,
				this.basicDeviceClass,
			),
			"generic device class": this.genericDeviceClass,
			"specific device class": this.specificDeviceClass,
			"supported CCs": this.supportedCCs
				.map((cc) => `\n· ${getCCName(cc)}`)
				.join(""),
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}

@applicationUpdateType(ApplicationUpdateTypes.SmartStart_HomeId_Received)
export class ApplicationUpdateRequestSmartStartHomeIDReceived
	extends ApplicationUpdateRequestSmartStartHomeIDReceivedBase
{}

@applicationUpdateType(
	ApplicationUpdateTypes.SmartStart_LongRange_HomeId_Received,
)
export class ApplicationUpdateRequestSmartStartLongRangeHomeIDReceived
	extends ApplicationUpdateRequestSmartStartHomeIDReceivedBase
{}

export interface ApplicationUpdateRequestSUCIdChangedOptions {
	sucNodeID: number;
}

@applicationUpdateType(ApplicationUpdateTypes.SUC_IdChanged)
export class ApplicationUpdateRequestSUCIdChanged
	extends ApplicationUpdateRequest
{
	public constructor(
		options:
			& ApplicationUpdateRequestSUCIdChangedOptions
			& MessageBaseOptions,
	) {
		super(options);

		this.sucNodeID = options.sucNodeID;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): ApplicationUpdateRequestSUCIdChanged {
		const { nodeId: sucNodeID } = parseNodeID(
			raw.payload,
			ctx.nodeIdType,
			0,
		);
		// byte 1/2 is 0, meaning unknown

		return new this({
			sucNodeID,
		});
	}

	public sucNodeID: number;

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			type: getEnumMemberName(ApplicationUpdateTypes, this.updateType),
			"SUC node ID": this.sucNodeID,
		};
		return {
			...super.toLogEntry(),
			message,
		};
	}
}
