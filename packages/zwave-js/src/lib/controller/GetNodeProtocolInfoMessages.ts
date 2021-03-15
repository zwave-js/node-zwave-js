import type { JSONObject } from "@zwave-js/shared";
import type { Driver } from "../driver/Driver";
import {
	FunctionType,
	MessagePriority,
	MessageType,
} from "../message/Constants";
import {
	expectedResponse,
	Message,
	MessageBaseOptions,
	MessageDeserializationOptions,
	messageTypes,
	priority,
} from "../message/Message";
import { DeviceClass } from "../node/DeviceClass";
import { DataRate, FLiRS, NodeType, ProtocolVersion } from "../node/Types";

interface GetNodeProtocolInfoRequestOptions extends MessageBaseOptions {
	requestedNodeId: number;
}

@messageTypes(MessageType.Request, FunctionType.GetNodeProtocolInfo)
@expectedResponse(FunctionType.GetNodeProtocolInfo)
@priority(MessagePriority.Controller)
export class GetNodeProtocolInfoRequest extends Message {
	public constructor(
		driver: Driver,
		options: GetNodeProtocolInfoRequestOptions,
	) {
		super(driver, options);
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
	public constructor(driver: Driver, options: MessageDeserializationOptions) {
		super(driver, options);

		const protocol = this.payload[0];
		this.isListening = !!(protocol & 0b10_000_000);
		this.isRouting = !!(protocol & 0b01_000_000);

		const supportedDataRates: DataRate[] = [];
		const maxSpeed = protocol & 0b00_011_000;
		const speedExtension = this.payload[2] & 0b111;
		if (maxSpeed & 0b00_010_000) {
			supportedDataRates.push(40000);
		}
		if (maxSpeed & 0b00_001_000) {
			supportedDataRates.push(9600);
		}
		if (speedExtension & 0b001) {
			supportedDataRates.push(100000);
		}
		if (supportedDataRates.length === 0) {
			supportedDataRates.push(9600);
		}
		this.supportedDataRates = supportedDataRates;

		this.protocolVersion = protocol & 0b111;

		const capability = this.payload[1];
		this.optionalFunctionality = !!(capability & 0b1000_0000);
		switch (capability & 0b0110_0000) {
			case 0b0100_0000:
				this.isFrequentListening = "1000ms";
				break;
			case 0b0010_0000:
				this.isFrequentListening = "250ms";
				break;
			default:
				this.isFrequentListening = false;
		}
		this.supportsBeaming = !!(capability & 0b0001_0000);

		switch (capability & 0b1010) {
			case 0b1000:
				this.nodeType = NodeType["Routing End Node"];
				break;
			case 0b0010:
			default:
				this.nodeType = NodeType.Controller;
				break;
		}

		const containsSpecificDeviceClass = !!(capability & 0b100);
		this.supportsSecurity = !!(capability & 0b1);

		// parse the device class
		const basic = this.payload[3];
		const generic = this.payload[4];
		const specific = containsSpecificDeviceClass ? this.payload[5] : 0x00;
		this.deviceClass = new DeviceClass(
			this.driver.configManager,
			basic,
			generic,
			specific,
		);
	}

	/** Whether this node is always listening or not */
	public readonly isListening: boolean;
	/** Indicates the wakeup interval if this node is a FLiRS node. `false` if it isn't. */
	public readonly isFrequentListening: FLiRS;
	/** Whether the node supports routing/forwarding messages. */
	public readonly isRouting: boolean;
	public readonly supportedDataRates: readonly DataRate[];
	public readonly protocolVersion: ProtocolVersion;
	/** Whether this node supports additional CCs besides the mandatory minimum */
	public readonly optionalFunctionality: boolean;
	/** Whether this node is a controller (can calculate routes) or an end node (relies on route info) */
	public readonly nodeType: NodeType;
	/** Whether this node supports security (S0 or S2) */
	public readonly supportsSecurity: boolean;
	/** Whether this node can issue wakeup beams to FLiRS nodes */
	public readonly supportsBeaming: boolean;
	public readonly deviceClass: DeviceClass;
}
