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

enum ProtocolFlags {
	Listening = 0b10_000_000,
	Routing = 0b01_000_000,

	Baudrate_100k = 0b00_011_000,
	Baudrate_40k = 0b00_010_000,
	Baudrate_9k6 = 0b00_001_000,
	BaudrateMask = 0b00_111_000,

	VersionMask = 0b111,
}

enum DeviceCapabilityFlags {
	Security = 1 << 0,
	Controller = 1 << 1,
	SpecificDevice = 1 << 2, // ?
	RoutingSlave = 1 << 3, // ?
	BeamCapability = 1 << 4,
	Sensor250ms = 1 << 5,
	Sensor1000ms = 1 << 6,
	OptionalFunctionality = 1 << 7,
}

export type Baudrate = 9600 | 40000 | 100000;

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
		this.isListening = (protocol & ProtocolFlags.Listening) !== 0;
		this.isRouting = (protocol & ProtocolFlags.Routing) !== 0;

		// This is an educated guess. OZW only checks for the 40k flag
		switch (protocol & ProtocolFlags.BaudrateMask) {
			case ProtocolFlags.Baudrate_100k:
				this.maxBaudRate = 100000;
				break;
			case ProtocolFlags.Baudrate_40k:
				this.maxBaudRate = 40000;
				break;
			case ProtocolFlags.Baudrate_9k6:
				this.maxBaudRate = 9600;
				break;
			default:
				// We don't know this baudrate yet, encode it as 0
				this.maxBaudRate = (0 as any) as Baudrate;
		}

		this.version = (protocol & ProtocolFlags.VersionMask) + 1;

		const capability = this.payload[1];
		this.isSecure = !!(capability & DeviceCapabilityFlags.Security);
		this.isFrequentListening = !!(
			capability &
			(DeviceCapabilityFlags.Sensor1000ms |
				DeviceCapabilityFlags.Sensor250ms)
		);
		this.isBeaming = !!(capability & DeviceCapabilityFlags.BeamCapability);
		this.isRoutingSlave = !!(
			capability & DeviceCapabilityFlags.RoutingSlave
		);
		this.isController = !!(capability & DeviceCapabilityFlags.Controller);

		// parse the device class
		const basic = this.payload[3];
		const generic = this.payload[4];
		const specific = this.payload[5];
		this.deviceClass = new DeviceClass(
			this.driver.configManager,
			basic,
			generic,
			specific,
		);
	}

	public readonly isListening: boolean;
	public readonly isFrequentListening: boolean;
	public readonly isRouting: boolean;
	public readonly maxBaudRate: Baudrate;
	public readonly isController: boolean;
	public readonly isRoutingSlave: boolean;
	public readonly isSecure: boolean;
	public readonly version: number;
	public readonly isBeaming: boolean;
	public readonly deviceClass: DeviceClass;

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			isListening: this.isListening,
			isFrequentListening: this.isFrequentListening,
			isRouting: this.isRouting,
			maxBaudRate: this.maxBaudRate,
			isSecure: this.isSecure,
			version: this.version,
			isBeaming: this.isBeaming,
			deviceClass: this.deviceClass,
		});
	}
}
