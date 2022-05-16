import {
	CommandClasses,
	getCCName,
	MessageOrCCLogEntry,
	MessageRecord,
	NodeUpdatePayload,
	parseCCList,
	parseNodeUpdatePayload,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import type { SuccessIndicator } from "@zwave-js/serial";
import {
	FunctionType,
	Message,
	MessageDeserializationOptions,
	MessageType,
	messageTypes,
} from "@zwave-js/serial";
import { buffer2hex, getEnumMemberName, JSONObject } from "@zwave-js/shared";

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

@messageTypes(MessageType.Request, FunctionType.ApplicationUpdateRequest)
// this is only received, not sent!
export class ApplicationUpdateRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this.updateType = this.payload[0];
		this.payload = this.payload.slice(1);

		let CommandConstructor: typeof ApplicationUpdateRequest | undefined;
		switch (this.updateType) {
			case ApplicationUpdateTypes.NodeInfo_Received:
				CommandConstructor = ApplicationUpdateRequestNodeInfoReceived;
				break;
			case ApplicationUpdateTypes.NodeInfo_RequestFailed:
				CommandConstructor =
					ApplicationUpdateRequestNodeInfoRequestFailed;
				break;
			case ApplicationUpdateTypes.SmartStart_HomeId_Received:
				CommandConstructor =
					ApplicationUpdateRequestSmartStartHomeIDReceived;
				break;
		}

		if (CommandConstructor && (new.target as any) !== CommandConstructor) {
			return new CommandConstructor(host, options);
		}
	}

	public readonly updateType: ApplicationUpdateTypes;
}

export class ApplicationUpdateRequestNodeInfoReceived extends ApplicationUpdateRequest {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);
		this._nodeInformation = parseNodeUpdatePayload(this.payload);
		this._nodeId = this._nodeInformation.nodeId;
	}

	private _nodeId: number;
	public get nodeId(): number {
		return this._nodeId;
	}

	private _nodeInformation: NodeUpdatePayload;
	public get nodeInformation(): NodeUpdatePayload {
		return this._nodeInformation;
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			updateType: ApplicationUpdateTypes[this.updateType],
			nodeId: this.nodeId,
			nodeInformation: this.nodeInformation,
		});
	}
}

export class ApplicationUpdateRequestNodeInfoRequestFailed
	extends ApplicationUpdateRequest
	implements SuccessIndicator
{
	isOK(): boolean {
		return false;
	}
}

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
