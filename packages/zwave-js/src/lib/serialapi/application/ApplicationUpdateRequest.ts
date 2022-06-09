import {
	CommandClasses,
	createSimpleReflectionDecorator,
	encodeNodeUpdatePayload,
	getCCName,
	MessageOrCCLogEntry,
	MessageRecord,
	NodeUpdatePayload,
	parseCCList,
	parseNodeUpdatePayload,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	DeserializingMessageConstructor,
	FunctionType,
	gotDeserializationOptions,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessageOptions,
	MessageType,
	messageTypes,
	SuccessIndicator,
} from "@zwave-js/serial";
import { buffer2hex, getEnumMemberName } from "@zwave-js/shared";

export enum ApplicationUpdateTypes {
	SmartStart_NodeInfo_Received = 0x86, // An included smart start node has been powered up
	SmartStart_HomeId_Received = 0x85, // A smart start node requests inclusion
	NodeInfo_Received = 0x84,
	NodeInfo_RequestDone = 0x82,
	NodeInfo_RequestFailed = 0x81,
	RoutingPending = 0x80,
	NewIdAssigned = 0x40,
	DeleteDone = 0x20,
	SUC_IdChanged = 0x10,
}

const {
	decorator: applicationUpdateType,
	lookupConstructor: getApplicationUpdateRequestConstructor,
} = createSimpleReflectionDecorator<
	ApplicationUpdateRequest,
	[updateType: ApplicationUpdateTypes],
	DeserializingMessageConstructor<ApplicationUpdateRequest>
>({
	name: "applicationUpdateType",
});

interface ApplicationUpdateRequestOptions extends MessageBaseOptions {
	updateType: ApplicationUpdateTypes;
}

@messageTypes(MessageType.Request, FunctionType.ApplicationUpdateRequest)
// this is only received, not sent!
export class ApplicationUpdateRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| ApplicationUpdateRequestOptions
			| MessageDeserializationOptions,
	) {
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
			this.updateType = options.updateType;
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

interface ApplicationUpdateRequestNodeInfoReceivedOptions
	extends MessageBaseOptions {
	nodeInformation: NodeUpdatePayload;
}

@applicationUpdateType(ApplicationUpdateTypes.NodeInfo_Received)
export class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| ApplicationUpdateRequestNodeInfoReceivedOptions,
	) {
		super(host, {
			...options,
			updateType: ApplicationUpdateTypes.NodeInfo_Received,
		});

		if (gotDeserializationOptions(options)) {
			this.nodeInformation = parseNodeUpdatePayload(this.payload);
			this.nodeId = this.nodeInformation.nodeId;
		} else {
			this.nodeId = options.nodeInformation.nodeId;
			this.nodeInformation = options.nodeInformation;
		}
	}

	public nodeId: number;
	public nodeInformation: NodeUpdatePayload;

	public serialize(): Buffer {
		this.payload = encodeNodeUpdatePayload(this.nodeInformation);
		return super.serialize();
	}
}

@applicationUpdateType(ApplicationUpdateTypes.NodeInfo_RequestFailed)
export class ApplicationUpdateRequestNodeInfoRequestFailed
	extends ApplicationUpdateRequest
	implements SuccessIndicator
{
	public constructor(host: ZWaveHost, options?: MessageOptions) {
		super(host, {
			...options,
			updateType: ApplicationUpdateTypes.NodeInfo_RequestFailed,
		});
	}

	isOK(): boolean {
		return false;
	}
}

@applicationUpdateType(ApplicationUpdateTypes.SmartStart_HomeId_Received)
export class ApplicationUpdateRequestSmartStartHomeIDReceived extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.remoteNodeId = this.payload[0];
		// payload[1] is rxStatus
		this.nwiHomeId = this.payload.slice(2, 6);

		const ccLength = this.payload[6];
		this.basicDeviceClass = this.payload[7];
		this.genericDeviceClass = this.payload[8];
		this.specificDeviceClass = this.payload[9];
		this.supportedCCs = parseCCList(
			this.payload.slice(10, 10 + ccLength),
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
