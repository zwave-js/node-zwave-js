import {
	DataRate,
	FLiRS,
	NodeType,
	parseNodeProtocolInfo,
	ProtocolVersion,
} from "@zwave-js/core";
import type { ZWaveHost } from "@zwave-js/host";
import {
	expectedResponse,
	FunctionType,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	MessagePriority,
	MessageType,
	messageTypes,
	priority,
} from "@zwave-js/serial";
import type { JSONObject } from "@zwave-js/shared";
import { DeviceClass } from "../../node/DeviceClass";

interface GetNodeProtocolInfoRequestOptions extends MessageBaseOptions {
	requestedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNodeProtocolInfo)
@expectedResponse(FunctionType.GetNodeProtocolInfo)
@priority(MessagePriority.Controller)
export class GetNodeProtocolInfoRequest extends Message {
	public constructor(
		host: ZWaveHost,
		options: GetNodeProtocolInfoRequestOptions,
	) {
		super(host, options);
		this.requestedNodeId = options.requestedNodeId;
	}

	// This must not be called nodeId or the message will be treated as a node query
	// but this is a message to the controller
	public requestedNodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.requestedNodeId]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			nodeId: this.requestedNodeId,
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.GetNodeProtocolInfo)
export class GetNodeProtocolInfoResponse extends Message {
	public constructor(
		host: ZWaveHost,
		options: MessageDeserializationOptions,
	) {
		super(host, options);

		const { hasSpecificDeviceClass, ...rest } = parseNodeProtocolInfo(
			this.payload,
			0,
		);
		Object.assign(this, rest);

		// parse the device class
		const basic = this.payload[3];
		const generic = this.payload[4];
		const specific = hasSpecificDeviceClass ? this.payload[5] : 0x00;
		this.deviceClass = new DeviceClass(
			this.host.configManager,
			basic,
			generic,
			specific,
		);
	}

	/** Whether this node is always listening or not */
	public readonly isListening!: boolean;
	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public readonly isFrequentListening!: FLiRS;
	/** Whether the node supports routing/forwarding messages. */
	public readonly isRouting!: boolean;
	public readonly supportedDataRates!: readonly DataRate[];
	public readonly protocolVersion!: ProtocolVersion;
	/** Whether this node supports additional CCs besides the mandatory minimum */
	public readonly optionalFunctionality!: boolean;
	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public readonly nodeType!: NodeType;
	/** Whether this node supports security (S0 or S2) */
	public readonly supportsSecurity!: boolean;
	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public readonly supportsBeaming!: boolean;
	public readonly deviceClass: DeviceClass;
}
