import {
	type BasicDeviceClass,
	type DataRate,
	type FLiRS,
	MessagePriority,
	type NodeProtocolInfoAndDeviceClass,
	type NodeType,
	type ProtocolVersion,
	encodeNodeID,
	encodeNodeProtocolInfo,
	isLongRangeNodeId,
	parseNodeID,
	parseNodeProtocolInfo,
} from "@zwave-js/core";
import {
	FunctionType,
	Message,
	type MessageBaseOptions,
	type MessageEncodingContext,
	type MessageParsingContext,
	type MessageRaw,
	MessageType,
	expectedResponse,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import { Bytes } from "@zwave-js/shared";
import { isObject } from "alcalzone-shared/typeguards";

export interface GetNodeProtocolInfoRequestOptions {
	requestedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNodeProtocolInfo)
@expectedResponse(FunctionType.GetNodeProtocolInfo)
@priority(MessagePriority.Controller)
export class GetNodeProtocolInfoRequest extends Message {
	public constructor(
		options: GetNodeProtocolInfoRequestOptions & MessageBaseOptions,
	) {
		super(options);
		this.requestedNodeId = options.requestedNodeId;
	}

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetNodeProtocolInfoRequest {
		const requestedNodeId =
			parseNodeID(raw.payload, ctx.nodeIdType, 0).nodeId;

		return new this({
			requestedNodeId,
		});
	}

	// This must not be called nodeId or the message will be treated as a node query
	// but this is a message to the controller
	public requestedNodeId: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
		this.payload = encodeNodeID(this.requestedNodeId, ctx.nodeIdType);
		return super.serialize(ctx);
	}
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GetNodeProtocolInfoResponseOptions
	extends NodeProtocolInfoAndDeviceClass
{}

@messageTypes(MessageType.Response, FunctionType.GetNodeProtocolInfo)
export class GetNodeProtocolInfoResponse extends Message {
	public constructor(
		options: GetNodeProtocolInfoResponseOptions & MessageBaseOptions,
	) {
		super(options);

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

	public static from(
		raw: MessageRaw,
		ctx: MessageParsingContext,
	): GetNodeProtocolInfoResponse {
		// The context should contain the node ID the protocol info was requested for.
		// We use it here to determine whether the node is long range.
		let isLongRange = false;
		const requestContext = ctx.requestStorage?.get(
			FunctionType.GetNodeProtocolInfo,
		);
		if (
			isObject(requestContext)
			&& "nodeId" in requestContext
			&& typeof requestContext.nodeId === "number"
		) {
			isLongRange = isLongRangeNodeId(requestContext.nodeId);
		}

		const { hasSpecificDeviceClass, ...rest } = parseNodeProtocolInfo(
			raw.payload,
			0,
			isLongRange,
		);
		const isListening: boolean = rest.isListening;
		const isFrequentListening: FLiRS = rest.isFrequentListening;
		const isRouting: boolean = rest.isRouting;
		const supportedDataRates: DataRate[] = rest.supportedDataRates;
		const protocolVersion: ProtocolVersion = rest.protocolVersion;
		const optionalFunctionality: boolean = rest.optionalFunctionality;
		const nodeType: NodeType = rest.nodeType;
		const supportsSecurity: boolean = rest.supportsSecurity;
		const supportsBeaming: boolean = rest.supportsBeaming;

		// parse the device class
		const basicDeviceClass: BasicDeviceClass = raw.payload[3];
		const genericDeviceClass = raw.payload[4];
		const specificDeviceClass = hasSpecificDeviceClass
			? raw.payload[5]
			: 0x00;

		return new this({
			isListening,
			isFrequentListening,
			isRouting,
			supportedDataRates,
			protocolVersion,
			optionalFunctionality,
			nodeType,
			supportsSecurity,
			supportsBeaming,
			basicDeviceClass,
			genericDeviceClass,
			specificDeviceClass,
		});
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

	public basicDeviceClass: BasicDeviceClass;
	public genericDeviceClass: number;
	public specificDeviceClass: number;

	public serialize(ctx: MessageEncodingContext): Promise<Bytes> {
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
		this.payload = Bytes.concat([
			protocolInfo,
			Bytes.from([
				this.basicDeviceClass,
				this.genericDeviceClass,
				this.specificDeviceClass,
			]),
		]);

		return super.serialize(ctx);
	}
}
