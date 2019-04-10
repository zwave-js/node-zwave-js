import { Driver } from "../driver/Driver";
import { FunctionType, MessagePriority, MessageType } from "../message/Constants";
import { expectedResponse, Message, messageTypes, priority } from "../message/Message";
import { BasicDeviceClasses, DeviceClass, GenericDeviceClass, SpecificDeviceClass } from "../node/DeviceClass";
import { INodeQuery } from "../node/INodeQuery";
import { JSONObject } from "../util/misc";

/* eslint-disable @typescript-eslint/camelcase */
const enum NodeCapabilityFlags {
	Listening = 0b10_000_000,
	Routing = 0b01_000_000,

	Baudrate_100k = 0b00_011_000,
	Baudrate_40k = 0b00_010_000,
	Baudrate_9k6 = 0b00_001_000,
	BaudrateMask = 0b00_111_000,

	VersionMask = 0b111,
}
/* eslint-enable @typescript-eslint/camelcase */

const enum SecurityFlags {
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

@messageTypes(MessageType.Request, FunctionType.GetNodeProtocolInfo)
@expectedResponse(FunctionType.GetNodeProtocolInfo)
@priority(MessagePriority.NodeQuery)
export class GetNodeProtocolInfoRequest extends Message implements INodeQuery {

	public constructor(
		driver: Driver,
		nodeId?: number,
	) {
		super(driver);
		this.nodeId = nodeId;
	}

	public nodeId: number;

	public serialize(): Buffer {
		this.payload = Buffer.from([this.nodeId]);
		return super.serialize();
	}

	public toJSON(): JSONObject {
		return super.toJSONInherited({
			nodeId: this.nodeId,
		});
	}

}

@messageTypes(MessageType.Response, FunctionType.GetNodeProtocolInfo)
export class GetNodeProtocolInfoResponse extends Message {

	private _isListening: boolean;
	public get isListening(): boolean {
		return this._isListening;
	}

	private _isFrequentListening: boolean;
	public get isFrequentListening(): boolean {
		return this._isFrequentListening;
	}

	private _isRouting: boolean;
	public get isRouting(): boolean {
		return this._isRouting;
	}

	private _maxBaudRate: Baudrate;
	public get maxBaudRate(): Baudrate {
		return this._maxBaudRate;
	}

	private _isSecure: boolean;
	public get isSecure(): boolean {
		return this._isSecure;
	}

	private _version: number;
	public get version(): number {
		return this._version;
	}

	private _isBeaming: boolean;
	public get isBeaming(): boolean {
		return this._isBeaming;
	}

	private _deviceClass: DeviceClass;
	public get deviceClass(): DeviceClass {
		return this._deviceClass;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		const capabilities = this.payload[0];
		this._isListening = (capabilities & NodeCapabilityFlags.Listening) !== 0;
		this._isRouting = (capabilities & NodeCapabilityFlags.Routing) !== 0;

		// This is an educated guess. OZW only checks for the 40k flag
		switch (capabilities & NodeCapabilityFlags.BaudrateMask) {
			case NodeCapabilityFlags.Baudrate_100k:
				this._maxBaudRate = 100000;
				break;
			case NodeCapabilityFlags.Baudrate_40k:
				this._maxBaudRate = 40000;
				break;
			case NodeCapabilityFlags.Baudrate_9k6:
				this._maxBaudRate = 9600;
				break;
		}

		this._version = (capabilities & NodeCapabilityFlags.VersionMask) + 1;

		const security = this.payload[1];
		this._isSecure = (security & SecurityFlags.Security) !== 0;
		this._isFrequentListening = (security & (SecurityFlags.Sensor1000ms | SecurityFlags.Sensor250ms)) !== 0;
		this._isBeaming = (security & SecurityFlags.BeamCapability) !== 0;

		// parse the device class
		const basic = this.payload[3] as BasicDeviceClasses;
		const generic = GenericDeviceClass.get(this.payload[4]);
		const specific = SpecificDeviceClass.get(generic.key, this.payload[5]);
		this._deviceClass = new DeviceClass(basic, generic, specific);

		return ret;
	}

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
