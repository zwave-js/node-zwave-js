import {
	MessagePriority,
	encodeNodeID,
	encodeNodeProtocolInfo,
	parseNodeProtocolInfo,
	type DataRate,
	type FLiRS,
	type NodeProtocolInfoAndDeviceClass,
	type NodeType,
	type ProtocolVersion,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	FunctionType,
	Message,
	MessageType,
	expectedResponse,
	gotDeserializationOptions,
	messageTypes,
	priority,
	type MessageBaseOptions,
	type MessageDeserializationOptions,
} from "@zwave-js/serial";

interface GetNodeProtocolInfoRequestOptions extends MessageBaseOptions {
	requestedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNodeProtocolInfo)
@expectedResponse(FunctionType.GetNodeProtocolInfo)
@priority(MessagePriority.Controller)
export class GetNodeProtocolInfoRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetNodeProtocolInfoRequestOptions,
	) {
		super(host, options);
		if (gotDeserializationOptions(options)) {
			this.requestedNodeId = this.payload[0];
		} else {
			this.requestedNodeId = options.requestedNodeId;
		}
	}

	// This must not be called nodeId or the message will be treated as a node query
	// but this is a message to the controller
	public requestedNodeId: number;

	public serialize(): Buffer {
		this.payload = encodeNodeID(this.requestedNodeId, this.host.nodeIdType);
		return super.serialize();
	}
}

interface GetNodeProtocolInfoResponseOptions
	extends MessageBaseOptions,
		NodeProtocolInfoAndDeviceClass {}

@messageTypes(MessageType.Response, FunctionType.GetNodeProtocolInfo)
export class GetNodeProtocolInfoResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options:
			| MessageDeserializationOptions
			| GetNodeProtocolInfoResponseOptions,
	) {
		super(host, options);

		if (gotDeserializationOptions(options)) {
			const { hasSpecificDeviceClass, ...rest } = parseNodeProtocolInfo(
				this.payload,
				0,
			);
			this.isListening = rest.isListening;
			this.isFrequentListening = rest.isFrequentListening;
			this.isRouting = rest.isRouting;
			this.supportedDataRates = rest.supportedDataRates;
			this.protocolVersion = rest.protocolVersion;
			this.optionalFunctionality = rest.optionalFunctionality;
			this.nodeType = rest.nodeType;
			this.supportsSecurity = rest.supportsSecurity;
			this.supportsBeaming = rest.supportsBeaming;

			// parse the device class
			this.basicDeviceClass = this.payload[3];
			this.genericDeviceClass = this.payload[4];
			this.specificDeviceClass = hasSpecificDeviceClass
				? this.payload[5]
				: 0x00;
		} else {
			this.isListening = options.isListening;
			this.isFrequentListening = options.isFrequentListening;
			this.isRouting = options.isRouting;
			this.supportedDataRates = options.supportedDataRates;
			this.protocolVersion = options.protocolVersion;
			this.optionalFunctionality = options.optionalFunctionality;
			this.nodeType = options.nodeType;
			this.supportsSecurity = options.supportsSecurity;
			this.supportsBeaming = options.supportsBeaming;
			this.basicDeviceClass = options.basicDeviceClass;
			this.genericDeviceClass = options.genericDeviceClass;
			this.specificDeviceClass = options.specificDeviceClass;
		}
	}

	/** Whether this node is always listening or not */
	public isListening: boolean;
	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public isFrequentListening: FLiRS;
	/** Whether the node supports routing/forwarding messages. */
	public isRouting: boolean;
	public supportedDataRates: DataRate[];
	public protocolVersion: ProtocolVersion;
	/** Whether this node supports additional CCs besides the mandatory minimum */
	public optionalFunctionality: boolean;
	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public nodeType: NodeType;
	/** Whether this node supports security (S0 or S2) */
	public supportsSecurity: boolean;
	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public supportsBeaming: boolean;

	public basicDeviceClass: number;
	public genericDeviceClass: number;
	public specificDeviceClass: number;

	public serialize(): Buffer {
		const protocolInfo = encodeNodeProtocolInfo({
			isListening: this.isListening,
			isFrequentListening: this.isFrequentListening,
			isRouting: this.isRouting,
			supportedDataRates: this.supportedDataRates,
			protocolVersion: this.protocolVersion,
			optionalFunctionality: this.optionalFunctionality,
			nodeType: this.nodeType,
			supportsSecurity: this.supportsSecurity,
			supportsBeaming: this.supportsBeaming,
			hasSpecificDeviceClass: this.specificDeviceClass !== 0,
		});
		this.payload = Buffer.concat([
			protocolInfo,
			Buffer.from([
				this.basicDeviceClass,
				this.genericDeviceClass,
				this.specificDeviceClass,
			]),
		]);

		return super.serialize();
	}
}
