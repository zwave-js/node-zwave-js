/// <reference types="reflect-metadata" />

import { GetControllerVersionRequest } from "../driver/GetControllerVersionMessages";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { log } from "../util/logger";
import { entries } from "../util/object-polyfill";
import { num2hex } from "../util/strings";

export interface Constructable<T> {
	new(...constructorArgs: any[]): T;
}

/**
 * Represents a ZWave message for communication with the serial interface
 */
export class Message {

	// #1
	constructor(
		payload?: Buffer,
	)

	// #2
	constructor(
		type: MessageType,
		funcType: FunctionType,
		expResponse: FunctionType,
		payload?: Buffer,
	)

	// implementation
	constructor(
		typeOrPayload?: MessageType | Buffer,
		funcType?: FunctionType,
		expResponse?: FunctionType,
		payload?: Buffer, // TODO: Length limit 255
	) {

		// decide which implementation we follow
		let type: MessageType;
		if (typeof typeOrPayload === "number") { // #2
			type = typeOrPayload;
		} else if (typeOrPayload instanceof Buffer) { // #1
			payload = typeOrPayload;
		}

		// These properties are filled from declared metadata if not provided
		this.type = type != null ? type : getMessageType(this);
		this.functionType = funcType != null ? funcType : getFunctionType(this);
		this.expectedResponse = expResponse != null ? expResponse : getExpectedResponse(this);
		// This is taken from the constructor args
		this.payload = payload;
	}

	public type: MessageType;
	public functionType: FunctionType;
	public expectedResponse: FunctionType;
	public payload: Buffer; // TODO: Length limit 255

	/** Serializes this message into a Buffer */
	public serialize(): Buffer {
		const payloadLength = this.payload != null ? this.payload.length : 0;

		const ret = Buffer.allocUnsafe(payloadLength + 5);
		ret[0] = MessageHeaders.SOF;
		// length of the following data, including the checksum
		ret[1] = payloadLength + 3;
		// write the remaining data
		ret[2] = this.type;
		ret[3] = this.functionType;
		if (this.payload != null) this.payload.copy(ret, 4);
		// followed by the checksum
		ret[ret.length - 1] = computeChecksum(ret);
		return ret;
	}

	/**
	 * Checks if there's enough data in the buffer to deserialize
	 */
	public static isComplete(data: Buffer): boolean {
		if (!data || !data.length || data.length < 5) return false; // not yet

		// check the length again, this time with the transmitted length
		const remainingLength = data[1];
		const messageLength = remainingLength + 2;
		if (data.length < messageLength) return false; // not yet

		return true; // probably, but the checksum may be wrong
	}

	/**
	 * Retrieves the correct constructor for the next message in the given Buffer.
	 * It is assumed that the buffer has been checked beforehand
	 */
	public static getConstructor(data: Buffer): Constructable<Message> {
		return getMessageConstructor(data[2], data[3]) || Message;
	}

	/**
	 * Deserializes a message of this type from a Buffer
	 * @returns must return the total number of bytes read
	 */
	public deserialize(data: Buffer): number {
		// SOF, length, type, commandId and checksum must be present
		if (!data || !data.length || data.length < 5) {
			throw new ZWaveError(
				"Could not deserialize the message because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// the packet has to start with SOF
		if (data[0] !== MessageHeaders.SOF) {
			throw new ZWaveError(
				"Could not deserialize the message because it does not start with SOF",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		// check the length again, this time with the transmitted length
		const remainingLength = data[1];
		const messageLength = remainingLength + 2;
		if (data.length < messageLength) {
			throw new ZWaveError(
				"Could not deserialize the message because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// check the checksum
		const expectedChecksum = computeChecksum(data.slice(0, messageLength));
		if (data[messageLength - 1] !== expectedChecksum) {
			throw new ZWaveError(
				"Could not deserialize the message because the checksum didn't match",
				ZWaveErrorCodes.PacketFormat_Checksum,
			);
		}

		this.type = data[2];
		this.functionType = data[3];
		const payloadLength = messageLength - 5;
		this.payload = data.slice(4, 4 + payloadLength);

		// return the total number of bytes in this message
		return messageLength;
	}

	public toJSON() {
		return this.toJSONInternal();
	}

	private toJSONInternal() {
		const ret: any = {
			name: this.constructor.name,
			type: MessageType[this.type],
			functionType: FunctionType[this.functionType] || num2hex(this.functionType),
		};
		if (this.expectedResponse != null) ret.expectedResponse = FunctionType[this.functionType];
		if (this.payload != null) ret.payload = this.payload.toString("hex");
		return ret;
	}

	protected toJSONInherited(props: Record<string, any>): Record<string, any> {
		const ret = this.toJSONInternal() as Record<string, any>;
		delete ret.payload;
		for (const [key, value] of entries(props)) {
			ret[key] = value;
		}
		return ret;
	}

}

function computeChecksum(message: Buffer): number {
	let ret = 0xff;
	// exclude SOF and checksum byte from the computation
	for (let i = 1; i < message.length - 1; i++) {
		ret ^= message[i];
	}
	return ret;
}

/** The priority of messages, sorted from high (0) to low (>0) */
export enum MessagePriority {
	// Controller commands are not to be interrupted and usually finish quickly
	Controller = 0,
	// The security queue is the highest actual priority because secured messages
	// require an encryption handshake before sending new messages
	Security,
	// Pings (NoOP) are used for device probing at startup and for network diagnostics
	Ping,
	// Multistep controller commands typically require user interaction but still
	// should happen at a higher priority than any node data exchange
	MultistepController,
	// Whenever sleeping devices wake up, their queued messages must be handled quickly
	// because they want to go to sleep soon. So prioritize them over non-sleeping devices
	WakeUp,
	// Normal operation and node data exchange
	Normal,
	// Node querying is expensive and happens whenever a new node is discovered.
	// In order to keep the system responsive, give them a lower priority
	NodeQuery,
	// Some devices need their state to be polled at regular intervals. Only do that when
	// nothing else needs to be done
	Poll,
}

export enum MessageHeaders {
	SOF = 0x01,
	ACK = 0x06,
	NAK = 0x15,
	CAN = 0x18,
}

/** Indicates the type of a data message */
export enum MessageType {
	Request = 0x0,
	Response = 0x1,
}

/**
 * Complete list of function IDs for data messages.
 * IDs starting with FUNC_ID are straight from OZW and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are taken from openhab-zwave and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are also taken from https://github.com/yepher/RaZBerry/blob/master/README.md and not implemented yet
 * IDs ending with UNKNOWN_<hex-code> are reported by the stick but we don't know what they mean.
 */
export enum FunctionType {
	GetSerialApiInitData = 0x02,

	FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION = 0x03,
	FUNC_ID_APPLICATION_COMMAND_HANDLER = 0x04,

	GetControllerCapabilities = 0x05,
	SetSerialApiTimeouts = 0x06,
	GetSerialApiCapabilities = 0x07,

	FUNC_ID_SERIAL_API_SOFT_RESET = 0x08,

	UNKNOWN_FUNC_UNKNOWN_0x09 = 0x09, // ??
	UNKNOWN_FUNC_UNKNOWN_0x0a = 0x0a, // ??

	UNKNOWN_FUNC_RF_RECEIVE_MODE = 0x10, // Power down the RF section of the stick
	UNKNOWN_FUNC_SET_SLEEP_MODE = 0x11, // Set the CPU into sleep mode

	FUNC_ID_ZW_SEND_NODE_INFORMATION = 0x12, // Send Node Information Frame of the stick
	FUNC_ID_ZW_SEND_DATA = 0x13, // Send data
	UNKNOWN_FUNC_SEND_DATA_MULTI = 0x14, // ??

	GetControllerVersion = 0x15,

	UNKNOWN_FUNC_SEND_DATA_ABORT = 0x16, // Abort sending data

	FUNC_ID_ZW_R_F_POWER_LEVEL_SET = 0x17, // Set RF Power level
	UNKNOWN_FUNC_SEND_DATA_META = 0x18, // ??
	FUNC_ID_ZW_GET_RANDOM = 0x1c, // Returns random data of variable length

	GetControllerId = 0x20, // Get Home ID and Controller Node ID

	UNKNOWN_FUNC_MEMORY_GET_BYTE = 0x21, // get a byte of memory
	UNKNOWN_FUNC_MEMORY_PUT_BYTE = 0x22, // write a byte of memory
	UNKNOWN_FUNC_MEMORY_GET_BUFFER = 0x23,
	UNKNOWN_FUNC_MEMORY_PUT_BUFFER = 0x24,

	UNKNOWN_FUNC_UNKNOWN_0x27 = 0x27, // ??
	UNKNOWN_FUNC_UNKNOWN_0x28 = 0x28, // ??
	UNKNOWN_FUNC_UNKNOWN_0x29 = 0x29, // ??
	UNKNOWN_FUNC_UNKNOWN_0x2a = 0x2a, // ??
	UNKNOWN_FUNC_UNKNOWN_0x2b = 0x2b, // ??
	UNKNOWN_FUNC_UNKNOWN_0x2c = 0x2c, // ??
	UNKNOWN_FUNC_UNKNOWN_0x2d = 0x2d, // ??

	UNKNOWN_FUNC_CLOCK_SET = 0x30, // ??
	UNKNOWN_FUNC_CLOCK_GET = 0x31, // ??
	UNKNOWN_FUNC_CLOCK_COMPARE = 0x32, // ??
	UNKNOWN_FUNC_RTC_TIMER_CREATE = 0x33, // ??
	UNKNOWN_FUNC_RTC_TIMER_READ = 0x34, // ??
	UNKNOWN_FUNC_RTC_TIMER_DELETE = 0x35, // ??
	UNKNOWN_FUNC_RTC_TIMER_CALL = 0x36, // ??

	FUNC_ID_ZW_SET_LEARN_NODE_STATE = 0x40,	// Not implemented

	GetNodeProtocolInfo = 0x41,	// Get protocol info (baud rate, listening, etc.) for a given node

	FUNC_ID_ZW_SET_DEFAULT = 0x42,	// Reset controller and node info to default (original) values
	FUNC_ID_ZW_NEW_CONTROLLER = 0x43,	// Not implemented
	FUNC_ID_ZW_REPLICATION_COMMAND_COMPLETE = 0x44,	// Replication send data complete
	FUNC_ID_ZW_REPLICATION_SEND_DATA = 0x45,	// Replication send data
	FUNC_ID_ZW_ASSIGN_RETURN_ROUTE = 0x46,	// Assign a return route from the specified node to the controller
	FUNC_ID_ZW_DELETE_RETURN_ROUTE = 0x47,	// Delete all return routes from the specified node
	FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE = 0x48,	// Ask the specified node to update its neighbors (then read them from the controller)
	FUNC_ID_ZW_APPLICATION_UPDATE = 0x49,	// Get a list of supported (and controller) command classes
	FUNC_ID_ZW_ADD_NODE_TO_NETWORK = 0x4a,	// Control the addnode (or addcontroller) process...start, stop, etc.
	FUNC_ID_ZW_REMOVE_NODE_FROM_NETWORK = 0x4b,	// Control the removenode (or removecontroller) process...start, stop, etc.
	FUNC_ID_ZW_CREATE_NEW_PRIMARY = 0x4c,	// Control the createnewprimary process...start, stop, etc.
	FUNC_ID_ZW_CONTROLLER_CHANGE = 0x4d,	// Control the transferprimary process...start, stop, etc.
	FUNC_ID_ZW_SET_LEARN_MODE = 0x50,	// Put a controller into learn mode for replication/ receipt of configuration info
	FUNC_ID_ZW_ASSIGN_SUC_RETURN_ROUTE = 0x51,	// Assign a return route to the SUC
	FUNC_ID_ZW_ENABLE_SUC = 0x52,	// Make a controller a Static Update Controller
	FUNC_ID_ZW_REQUEST_NETWORK_UPDATE = 0x53,	// Network update for a SUC(?)
	FUNC_ID_ZW_SET_SUC_NODE_ID = 0x54,	// Identify a Static Update Controller node id
	FUNC_ID_ZW_DELETE_SUC_RETURN_ROUTE = 0x55,	// Remove return routes to the SUC

	GetSUCNodeId = 0x56, // Try to retrieve a Static Update Controller node id (zero if no SUC present)

	UNKNOWN_FUNC_SEND_SUC_ID = 0x57,
	UNKNOWN_FUNC_REDISCOVERY_NEEDED = 0x59,

	FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 0x5a,	// Allow options for request node neighbor update
	FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION = 0x5e,	// supports NWI
	FUNC_ID_ZW_REQUEST_NODE_INFO = 0x60,	// Get info (supported command classes) for the specified node
	FUNC_ID_ZW_REMOVE_FAILED_NODE_ID = 0x61,	// Mark a specified node id as failed
	FUNC_ID_ZW_IS_FAILED_NODE_ID = 0x62,	// Check to see if a specified node has failed
	FUNC_ID_ZW_REPLACE_FAILED_NODE = 0x63,	// Remove a failed node from the controller's list (?)

	UNKNOWN_FUNC_UNKNOWN_0x66 = 0x66, // ??
	UNKNOWN_FUNC_UNKNOWN_0x67 = 0x67, // ??

	UNKNOWN_FUNC_TIMER_START = 0x70, // ??
	UNKNOWN_FUNC_TIMER_RESTART = 0x71, // ??
	UNKNOWN_FUNC_TIMER_CANCEL = 0x72, // ??
	UNKNOWN_FUNC_TIMER_CALL = 0x73, // ??

	UNKNOWN_FUNC_UNKNOWN_0x78 = 0x78, // ??

	FUNC_ID_ZW_GET_ROUTING_INFO = 0x80,	// Get a specified node's neighbor information from the controller

	UNKNOWN_FUNC_GetRoutingTableLine = 0x80, // ??
	UNKNOWN_FUNC_GetTXCounter = 0x81, // ??
	UNKNOWN_FUNC_ResetTXCounter = 0x82, // ??
	UNKNOWN_FUNC_StoreNodeInfo = 0x83, // ??
	UNKNOWN_FUNC_StoreHomeId = 0x84, // ??

	UNKNOWN_FUNC_LOCK_ROUTE_RESPONSE = 0x90, // ??
	UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO = 0x91, // ??
	UNKNOWN_FUNC_UNKNOWN_0x92 = 0x92, // ??
	UNKNOWN_FUNC_UNKNOWN_0x93 = 0x93, // ??
	UNKNOWN_FUNC_SERIAL_API_TEST = 0x95, // ??
	UNKNOWN_FUNC_UNKNOWN_0x98 = 0x98, // ??

	FUNC_ID_SERIAL_API_SLAVE_NODE_INFO = 0xA0,	// Set application virtual slave node information
	FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 0xA1,	// Slave command handler
	FUNC_ID_ZW_SEND_SLAVE_NODE_INFO = 0xA2,	// Send a slave node information message
	FUNC_ID_ZW_SEND_SLAVE_DATA = 0xA3,	// Send data from slave
	FUNC_ID_ZW_SET_SLAVE_LEARN_MODE = 0xA4,	// Enter slave learn mode
	FUNC_ID_ZW_GET_VIRTUAL_NODES = 0xA5,	// Return all virtual nodes
	FUNC_ID_ZW_IS_VIRTUAL_NODE = 0xA6,	// Virtual node test

	UNKNOWN_FUNC_UNKNOWN_0xB4 = 0xB4, // ??

	UNKNOWN_FUNC_WATCH_DOG_ENABLE = 0xB6,
	UNKNOWN_FUNC_WATCH_DOG_DISABLE = 0xB7,
	UNKNOWN_FUNC_WATCH_DOG_KICK = 0xB8,
	UNKNOWN_FUNC_UNKNOWN_0xB9 = 0xB9, // ??
	UNKNOWN_FUNC_RF_POWERLEVEL_GET = 0xBA, // Get RF Power level

	UNKNOWN_FUNC_GET_LIBRARY_TYPE = 0xBD,
	UNKNOWN_FUNC_SEND_TEST_FRAME = 0xBE,
	UNKNOWN_FUNC_GET_PROTOCOL_STATUS = 0xBF,

	FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 0xD0,	// Set controller into promiscuous mode to listen to all messages
	FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 0xD1,

	UNKNOWN_FUNC_UNKNOWN_0xD2 = 0xD2, // ??
	UNKNOWN_FUNC_UNKNOWN_0xD3 = 0xD3, // ??
	UNKNOWN_FUNC_UNKNOWN_0xD4 = 0xD4, // ??
	UNKNOWN_FUNC_UNKNOWN_0xEF = 0xEF, // ??
	UNKNOWN_FUNC_UNKNOWN_0xF2 = 0xF2, // ??
	UNKNOWN_FUNC_UNKNOWN_0xF4 = 0xF4, // ??
	UNKNOWN_FUNC_UNKNOWN_0xF5 = 0xF5, // ??
}

// =======================
// use decorators to link function types to message classes
// tslint:disable:variable-name
export const METADATA_messageTypes = Symbol("messageTypes");
export const METADATA_messageTypeMap = Symbol("messageTypeMap");
export const METADATA_expectedResponse = Symbol("expectedResponse");
export const METADATA_priority = Symbol("priority");
// tslint:enable:variable-name

// Pre-create the lookup maps for the contructors
type MessageTypeMap = Map<string, Constructable<Message>>;

function getMessageTypeMapKey(messageType: MessageType, functionType: FunctionType): string {
	return JSON.stringify({ messageType, functionType });
}

/**
 * Defines the message and function type associated with a Z-Wave message
 */
export function messageTypes(messageType: MessageType, functionType: FunctionType): ClassDecorator {
	return (messageClass) => {
		log("protocol", `${messageClass.name}: defining message type ${num2hex(messageType)} and function type ${num2hex(functionType)}`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_messageTypes, { messageType, functionType }, messageClass);

		// also store a map in the Message metadata for lookup.
		const map: MessageTypeMap = Reflect.getMetadata(METADATA_messageTypeMap, Message) || new Map();
		map.set(getMessageTypeMapKey(messageType, functionType), messageClass as any as Constructable<Message>);
		Reflect.defineMetadata(METADATA_messageTypeMap, map, Message);
	};
}

/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export function getMessageType<T extends Message>(messageClass: T): MessageType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, constr);
	const ret = meta && meta.messageType;
	log("protocol", `${constr.name}: retrieving message type => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export function getMessageTypeStatic<T extends Constructable<Message>>(classConstructor: T): MessageType {
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, classConstructor);
	const ret = meta && meta.messageType;
	log("protocol", `${classConstructor.name}: retrieving message type => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionType<T extends Message>(messageClass: T): FunctionType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, constr);
	const ret = meta && meta.functionType;
	log("protocol", `${constr.name}: retrieving function type => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionTypeStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType {
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, classConstructor);
	const ret = meta && meta.functionType;
	log("protocol", `${classConstructor.name}: retrieving function type => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Looks up the message constructor for a given message type and function type
 */
export function getMessageConstructor(messageType: MessageType, functionType: FunctionType): Constructable<Message> {
	// also store it in the Message class for lookup purposes
	const functionTypeMap = Reflect.getMetadata(METADATA_messageTypeMap, Message) as MessageTypeMap;
	if (functionTypeMap != null) return functionTypeMap.get(getMessageTypeMapKey(messageType, functionType));
}

/**
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedResponse(type: FunctionType): ClassDecorator {
	return (messageClass) => {
		log("protocol", `${messageClass.name}: defining expected response ${num2hex(type)}`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_expectedResponse, type, messageClass);
	};
}

/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export function getExpectedResponse<T extends Message>(messageClass: T): FunctionType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, constr);
	log("protocol", `${constr.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedResponseStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, classConstructor);
	log("protocol", `${classConstructor.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	return ret;
}

/**
 * Defines the default priority associated with a Z-Wave message
 */
export function priority(prio: MessagePriority): ClassDecorator {
	return (messageClass) => {
		log("protocol", `${messageClass.name}: defining default priority ${MessagePriority[prio]} (${prio})`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_priority, prio, messageClass);
	};
}

/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export function getDefaultPriority<T extends Message>(messageClass: T): MessagePriority {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_priority, constr);
	log("protocol", `${constr.name}: retrieving default priority => ${MessagePriority[ret]} (${ret})`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getDefaultPriorityStatic<T extends Constructable<Message>>(classConstructor: T): MessagePriority {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_priority, classConstructor);
	log("protocol", `${classConstructor.name}: retrieving default priority => ${MessagePriority[ret]} (${ret})`, "silly");
	return ret;
}
