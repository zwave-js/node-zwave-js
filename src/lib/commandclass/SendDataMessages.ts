import { Constructable, expectedResponse, FunctionType, Message, MessagePriority, MessageType, messageTypes, priority } from "../message/Message";
import { log } from "../util/logger";

export enum TransmitOptions {
	NotSet = 0,

	ACK = 1 << 0,
	LowPower = 1 << 1,
	AutoRoute = 1 << 2,

	NoRoute = 1 << 4,
	Explore = 1 << 5,

	DEFAULT = ACK | AutoRoute | Explore,
}

// TODO: what is this?
export enum TransmitStatus {
	OK = 0x00, // Transmission complete and ACK received
	NoAck = 0x01, // Transmission complete, no ACK received
	Fail = 0x02, // Transmission failed
	NotIdle = 0x03, // Transmission failed, network busy
	NoRoute = 0x04, // Tranmission complete, no return route
}

let lastCallbackId = 0;
function getNextCallbackId(): number {
	lastCallbackId++;
	if (lastCallbackId > 0xff) lastCallbackId = 1;
	return lastCallbackId;
}

@messageTypes(MessageType.Request, FunctionType.SendData)
@expectedResponse(FunctionType.SendData)
@priority(MessagePriority.Normal)
export class SendDataRequest extends Message {

	// tslint:disable:unified-signatures
	// empty constructor to parse messages
	constructor();
	// default constructor to send messages
	constructor(
		nodeId: number,
		cc: CommandClasses,
		ccPayload?: Buffer,
		transmitOptions?: TransmitOptions,
		callbackId?: number,
	);
	constructor(
		/** The ID of the node this request is addressed to/from */
		public nodeId?: number,
		/** The command this message contains */
		public cc?: CommandClasses,
		/** The payload for the command */
		public ccPayload?: Buffer,
		/** Options regarding the transmission of the message */
		public transmitOptions?: TransmitOptions,
		/** A callback ID to map requests and responses */
		public callbackId?: number,
	) {
		super();
		// Extract the cc from declared metadata if not provided
		this.cc = cc != null ? cc : getCommandClass(this);
		if (nodeId != null) {
			// non-empty constructor -> define default values
			if (this.ccPayload == null) this.ccPayload = Buffer.from([]);
			if (this.transmitOptions == null) this.transmitOptions = TransmitOptions.DEFAULT;
			if (this.callbackId == null) this.callbackId = getNextCallbackId();
		}
	}
	// tslint:enable:unified-signatures

	public serialize(): Buffer {
		const payloadLength = this.ccPayload != null ? this.ccPayload.length : 0;
		const ret = Buffer.allocUnsafe(payloadLength + 5);
		ret[0] = this.nodeId;
		// the serialized length includes the command class itself
		ret[1] = payloadLength + 1;
		ret[2] = this.cc;
		if (this.ccPayload != null) this.ccPayload.copy(ret, 3);
		ret[ret.length - 2] = this.transmitOptions;
		ret[ret.length - 1] = this.callbackId;
		this.payload = ret;

		return super.serialize();
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this.nodeId = this.payload[0];
		// the serialized length includes the command class itself
		const dataLength = this.payload[1] - 1;
		this.cc = this.payload[2];
		this.ccPayload = Buffer.allocUnsafe(dataLength);
		this.payload.copy(this.ccPayload, 0, 3, 3 + dataLength);
		this.transmitOptions = this.payload[this.payload.length - 2];
		this.callbackId = this.payload[this.payload.length - 1];

		return ret;
	}

	/**
	 * Checks if a given Buffer contains a serialized SendDataRequest.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static isSendDataRequest(data: Buffer): boolean {
		const msgType: MessageType = data[2];
		const fnType: FunctionType = data[3];
		return msgType === MessageType.Request && fnType === FunctionType.SendData;
	}

	/**
	 * Extracts the command class from a serialized SendDataRequest
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static extractCommandClass(data: Buffer): CommandClasses {
		const payload = Message.getPayload(data);
		return payload[2];
	}

	/**
	 * Retrieves the correct constructor for the SendData request in the given Buffer.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static getConstructor(data: Buffer): Constructable<SendDataRequest> {
		const cc = SendDataRequest.extractCommandClass(data);
		return getCCConstructor(cc) || SendDataRequest;
	}

	public toJSON() {
		return super.toJSONInherited({
			nodeId: this.nodeId,
			transmitOptions: this.transmitOptions,
			callbackId: this.callbackId,
			data: this.ccPayload.toString("hex"),
		});
	}
}

@messageTypes(MessageType.Response, FunctionType.SendData)
export class SendDataResponse extends Message {

	private _wasSent: boolean;
	public get wasSent(): boolean {
		return this._wasSent;
	}

	private _errorCode: number;
	public get errorCode(): number {
		return this._errorCode;
	}

	public deserialize(data: Buffer): number {
		const ret = super.deserialize(data);

		this._wasSent = this.payload[0] !== 0;
		if (!this._wasSent) this._errorCode = this.payload[0];

		return ret;
	}

	public toJSON() {
		return super.toJSONInherited({
			wasSent: this.wasSent,
			errorCode: this.errorCode,
		});
	}

}

/* A dictionary of all command classes as of 2018-03-30 */
export enum CommandClasses {
	"Alarm" = 0x71,
	"Alarm Sensor" = 0x9C,
	"Alarm Silence" = 0x9D,
	"All Switch" = 0x27,
	"Anti-theft" = 0x5D,
	"Application Capability" = 0x57,
	"Application Status" = 0x22,
	"Association" = 0x85,
	"Association Command Configuration" = 0x9B,
	"Association Group Information (AGI)" = 0x59,
	"Barrier Operator" = 0x66,
	"Basic" = 0x20,
	"Basic Tariff Information" = 0x36,
	"Basic Window Covering" = 0x50,
	"Battery" = 0x80,
	"Binary Sensor" = 0x30,
	"Binary Switch" = 0x25,
	"Binary Toggle Switch" = 0x28,
	"Climate Control Schedule" = 0x46,
	"Central Scene" = 0x5B,
	"Clock" = 0x81,
	"Color Switch" = 0x33,
	"Configuration" = 0x70,
	"Controller Replication" = 0x21,
	"CRC-16 Encapsulation" = 0x56,
	"Demand Control Plan Configuration" = 0x3A,
	"Demand Control Plan Monitor" = 0x3B,
	"Device Reset Locally" = 0x5A,
	"Door Lock" = 0x62,
	"Door Lock Logging" = 0x4C,
	"Energy Production" = 0x90,
	"Entry Control" = 0x6F,
	"Firmware Update Meta Data" = 0x7A,
	"Geographic Location" = 0x8C,
	"Grouping Name" = 0x7B,
	"Hail" = 0x82,
	"HRV Status" = 0x37,
	"HRV Control" = 0x39,
	"Humidity Control Mode" = 0x6D,
	"Humidity Control Operating State" = 0x6E,
	"Humidity Control Setpoint" = 0x64,
	"Inclusion Controller" = 0x74,
	"Indicator" = 0x87,
	"IP Association" = 0x5C,
	"IP Configuration" = 0x9A,
	"Irrigation" = 0x6B,
	"Language" = 0x89,
	"Lock" = 0x76,
	"Mailbox" = 0x69,
	"Manufacturer Proprietary" = 0x91,
	"Manufacturer Specific" = 0x72,
	"Support/Control Mark" = 0xEF,
	"Meter" = 0x32,
	"Meter Table Configuration" = 0x3C,
	"Meter Table Monitor" = 0x3D,
	"Meter Table Push Configuration" = 0x3E,
	"Move To Position Window Covering" = 0x51,
	"Multi Channel" = 0x60,
	"Multi Channel Association" = 0x8E,
	"Multi Command" = 0x8F,
	"Multilevel Sensor" = 0x31,
	"Multilevel Switch" = 0x26,
	"Multilevel Toggle Switch" = 0x29,
	"Network Management Basic Node" = 0x4D,
	"Network Management Inclusion" = 0x34,
	"Network Management Installation and Maintenance" = 0x67,
	"Network Management Primary" = 0x54,
	"Network Management Proxy" = 0x52,
	"No Operation" = 0x00,
	"Node Naming and Location" = 0x77,
	"Node Provisioning" = 0x78,
	"Notification" = 0x71,
	"Powerlevel" = 0x73,
	"Prepayment" = 0x3F,
	"Prepayment Encapsulation" = 0x41,
	"Proprietary" = 0x88,
	"Protection" = 0x75,
	"Pulse Meter" = 0x35,
	"Rate Table Configuration" = 0x48,
	"Rate Table Monitor" = 0x49,
	"Remote Association Activation" = 0x7C,
	"Remote Association Configuration" = 0x7D,
	"Scene Activation" = 0x2B,
	"Scene Actuator Configuration" = 0x2C,
	"Scene Controller Configuration" = 0x2D,
	"Schedule" = 0x53,
	"Schedule Entry Lock" = 0x4E,
	"Screen Attributes" = 0x93,
	"Screen Meta Data" = 0x92,
	"Security" = 0x98, // basic version of the security command class
	"Security 2" = 0x9F,
	"Security Mark" = 0xF100,
	"Sensor Configuration" = 0x9E,
	"Simple AV Control" = 0x94,
	"Sound Switch" = 0x79,
	"Supervision" = 0x6C,
	"Tariff Table Configuration" = 0x4A,
	"Tariff Table Monitor" = 0x4B,
	"Thermostat Fan Mode" = 0x44,
	"Thermostat Fan State" = 0x45,
	"Thermostat Mode" = 0x40,
	"Thermostat Operating State" = 0x42,
	"Thermostat Setback" = 0x47,
	"Thermostat Setpoint" = 0x43,
	"Time" = 0x8A,
	"Time Parameters" = 0x8B,
	"Transport Service" = 0x55,
	"User Code" = 0x63,
	"Version" = 0x86,
	"Wake Up" = 0x84,
	"Window Covering" = 0x6A,
	"Z/IP" = 0x23,
	"Z/IP 6LoWPAN" = 0x4F,
	"Z/IP Gateway" = 0x5F,
	"Z/IP Naming and Location" = 0x68,
	"Z/IP ND" = 0x58,
	"Z/IP Portal" = 0x61,
	"Z-Wave Plus Info" = 0x5E,
}

// =======================
// use decorators to link command class values to actual command classes
// tslint:disable:variable-name
export const METADATA_commandClass = Symbol("commandClass");
export const METADATA_commandClassMap = Symbol("commandClassMap");
// tslint:enable:variable-name

// Pre-create the lookup maps for the contructors
type CommandClassMap = Map<CommandClasses, Constructable<SendDataRequest>>;

function getMessageTypeMapKey(messageType: MessageType, functionType: FunctionType): string {
	return JSON.stringify({ messageType, functionType });
}

/**
 * Defines the command class associated with a Z-Wave message
 */
export function commandClass(cc: CommandClasses): ClassDecorator {
	return (messageClass) => {
		log("protocol", `${messageClass.name}: defining command class ${CommandClasses[cc]} (${cc})`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_commandClass, cc, messageClass);

		// also store a map in the Message metadata for lookup.
		const map: CommandClassMap = Reflect.getMetadata(METADATA_commandClassMap, SendDataRequest) || new Map();
		map.set(cc, messageClass as any as Constructable<SendDataRequest>);
		Reflect.defineMetadata(METADATA_commandClassMap, map, SendDataRequest);
	};
}

/**
 * Retrieves the command class defined for a Z-Wave message class
 */
export function getCommandClass<T extends Message>(messageClass: T): CommandClasses {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_commandClass, constr);
	log("protocol", `${constr.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getCommandClassStatic<T extends Constructable<SendDataRequest>>(classConstructor: T): CommandClasses {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_commandClass, classConstructor);
	log("protocol", `${classConstructor.name}: retrieving command class => ${CommandClasses[ret]} (${ret})`, "silly");
	return ret;
}

/**
 * Looks up the command class constructor for a given command class type and function type
 */
export function getCCConstructor(cc: CommandClasses): Constructable<SendDataRequest> {
	// Retrieve the constructor map from the SendDataRequest class
	const map = Reflect.getMetadata(METADATA_commandClassMap, SendDataRequest) as CommandClassMap;
	if (map != null) return map.get(cc);
}
