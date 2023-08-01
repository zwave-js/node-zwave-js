import {
	createSimpleReflectionDecorator,
	encodeNodeUpdatePayload,
	getCCName,
	parseCCList,
	parseNodeID,
	parseNodeUpdatePayload,
	type CommandClasses,
	type MessageOrCCLogEntry,
	type MessageRecord,
	type NodeUpdatePayload,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	gotDeserializationOptions,
	messageTypes,
	type DeserializingMessageConstructor,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
	type MessageOptions,
	type SuccessIndicator,
} from "@zwave-js/serial";
import { buffer2hex, getEnumMemberName } from "@zwave-js/shared";

export enum ApplicationUpdateTypes {
	SmartStart_NodeInfo_Received = 0x86, // An included smart start node has been powered up
	SmartStart_HomeId_Received = 0x85, // A smart start node requests inclusion
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
	ApplicationUpdateRequest,
	[updateType: ApplicationUpdateTypes],
	DeserializingMessageConstructor<ApplicationUpdateRequest>
>({
	name: "applicationUpdateType",
});

@messageTypes(MessageType.Request, FunctionType.ApplicationUpdateRequest)
// this is only received, not sent!
export class ApplicationUpdateRequest extends Message {
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.updateType = this.payload[0];

			const CommandConstructor = getApplicationUpdateRequestConstructor(
				this.updateType,
			);
			if (
				CommandConstructor &&
				(new.target as any) !== CommandConstructor
			) {
				return new CommandConstructor(host, options);
			}

			this.payload = this.payload.slice(1);
		} else {
			this.updateType = getApplicationUpdateType(this)!;
		}
	}

	public readonly updateType: ApplicationUpdateTypes;

	public serialize(): Buffer {
		this.payload = Buffer.concat([
			Buffer.from([this.updateType]),
			this.payload,
		]);
		return super.serialize();
	}
}

interface ApplicationUpdateRequestWithNodeInfoOptions
	extends MessageBaseOptions {
	nodeInformation: NodeUpdatePayload;
}

export class ApplicationUpdateRequestWithNodeInfo extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ApplicationUpdateRequestWithNodeInfoOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			this.nodeInformation = parseNodeUpdatePayload(
				this.payload,
				this.host.nodeIdType,
			);
			this.nodeId = this.nodeInformation.nodeId;
		} else {
			this.nodeId = options.nodeInformation.nodeId;
			this.nodeInformation = options.nodeInformation;
		}
	}

	public nodeId: number;
	public nodeInformation: NodeUpdatePayload;

	public serialize(): Buffer {
		this.payload = encodeNodeUpdatePayload(
			this.nodeInformation,
			this.host.nodeIdType,
		);
		return super.serialize();
	}
}

@applicationUpdateType(ApplicationUpdateTypes.NodeInfo_Received)
export class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequestWithNodeInfo {}

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
export class ApplicationUpdateRequestNodeAdded extends ApplicationUpdateRequestWithNodeInfo {}

@applicationUpdateType(ApplicationUpdateTypes.Node_Removed)
export class ApplicationUpdateRequestNodeRemoved extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		const { nodeId } = parseNodeID(this.payload, host.nodeIdType, 0);
		this.nodeId = nodeId;
		// byte 1/2 is 0, meaning unknown
	}

	public nodeId: number;
}

@applicationUpdateType(ApplicationUpdateTypes.SmartStart_HomeId_Received)
export class ApplicationUpdateRequestSmartStartHomeIDReceived extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		let offset = 0;
		const { nodeId, bytesRead: nodeIdBytes } = parseNodeID(
			this.payload,
			host.nodeIdType,
			offset,
		);
		offset += nodeIdBytes;
		this.remoteNodeId = nodeId;

		// next byte is rxStatus
		offset++;

		this.nwiHomeId = this.payload.slice(offset, offset + 4);
		offset += 4;

		const ccLength = this.payload[offset++];
		this.basicDeviceClass = this.payload[offset++];
		this.genericDeviceClass = this.payload[offset++];
		this.specificDeviceClass = this.payload[offset++];
		this.supportedCCs = parseCCList(
			this.payload.slice(offset, offset + ccLength),
		).supportedCCs;
	}

	public readonly remoteNodeId: number;
	public readonly nwiHomeId: Buffer;

	public readonly basicDeviceClass: number;
	public readonly genericDeviceClass: number;
	public readonly specificDeviceClass: number;
	public readonly supportedCCs: readonly CommandClasses[];

	public toLogEntry(): MessageOrCCLogEntry {
		const message: MessageRecord = {
			type: getEnumMemberName(ApplicationUpdateTypes, this.updateType),
			"remote node ID": this.remoteNodeId,
			"NWI home ID": buffer2hex(this.nwiHomeId),
			"basic device class": this.basicDeviceClass,
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
