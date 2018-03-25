/// <reference types="reflect-metadata" />

import { GetControllerVersionRequest } from "../driver/GetControllerVersionMessages";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { log } from "../util/logger";

export interface Constructable<T> {
	new(...constructorArgs: any[]): T;
}

/**
 * Represents a ZWave frame for communication with the serial interface
 */
export class Frame {

	// #1
	constructor(
		payload?: Buffer,
	)

	// #2
	constructor(
		type: FrameType,
		funcType: FunctionType,
		expResponse: FunctionType,
		payload?: Buffer,
	)

	// implementation
	constructor(
		typeOrPayload?: FrameType | Buffer,
		funcType?: FunctionType,
		expResponse?: FunctionType,
		payload?: Buffer, // TODO: Length limit 255
	) {

		// decide which implementation we follow
		let type: FrameType;
		if (typeof typeOrPayload === "number") { // #2
			type = typeOrPayload;
		} else if (typeOrPayload instanceof Buffer) { // #1
			payload = typeOrPayload;
		}

		// These properties are filled from declared metadata if not provided
		this.type = type || getFrameType(this);
		this.functionType = funcType || getFunctionType(this);
		this.expectedResponse = expResponse || getExpectedResponse(this);
		// This is taken from the constructor args
		this.payload = payload;
	}

	public type: FrameType;
	public functionType: FunctionType;
	public expectedResponse: FunctionType;
	public payload: Buffer; // TODO: Length limit 255

	/** Serializes this frame into a Buffer */
	public serialize(): Buffer {
		const payloadLength = this.payload != null ? this.payload.length : 0;

		const ret = Buffer.allocUnsafe(payloadLength + 5);
		ret[0] = FrameHeaders.SOF;
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
	 * Deserializes a frame of this type from a Buffer
	 * @returns must return the total number of bytes read
	 */
	public deserialize(data: Buffer): number {
		// SOF, length, type, commandId and checksum must be present
		if (!data || !data.length || data.length < 5) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// the packet has to start with SOF
		if (data[0] !== FrameHeaders.SOF) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it does not start with SOF",
				ZWaveErrorCodes.PacketFormat_Invalid,
			);
		}
		// check the lenght again, this time with the transmitted length
		const remainingLength = data[1];
		const frameLength = remainingLength + 2;
		if (data.length < frameLength) {
			throw new ZWaveError(
				"Could not deserialize the data frame because it was truncated",
				ZWaveErrorCodes.PacketFormat_Truncated,
			);
		}
		// check the checksum
		const expectedChecksum = computeChecksum(data.slice(0, frameLength));
		if (data[frameLength - 1] !== expectedChecksum) {
			throw new ZWaveError(
				"Could not deserialize the data frame because the checksum didn't match",
				ZWaveErrorCodes.PacketFormat_Checksum,
			);
		}

		this.type = data[2];
		this.functionType = data[3];
		const payloadLength = frameLength - 5;
		this.payload = data.slice(4, 4 + payloadLength);

		// return the total number of bytes in this frame
		return frameLength;
	}

}

function computeChecksum(frame: Buffer): number {
	let ret = 0xff;
	// exclude SOF and checksum byte from the computation
	for (let i = 1; i < frame.length - 1; i++) {
		ret ^= frame[i];
	}
	return ret;
}

export const enum FrameHeaders {
	SOF = 0x01,
	ACK = 0x06,
	NAK = 0x15,
	CAN = 0x18,
}

/** Indicates the type of a data frame */
export enum FrameType {
	Request = 0x0,
	Response = 0x1,
}

/**
 * Complete list of function IDs for data frames.
 * IDs started with FUNC_ID are straight from OZW and not implemented here yet
 */
export enum FunctionType {
	FUNC_ID_ZW_SEND_NODE_INFORMATION = 0x12,
	FUNC_ID_ZW_SEND_DATA = 0x13,

	GetControllerVersion = 0x15,

	FUNC_ID_ZW_R_F_POWER_LEVEL_SET = 0x17,
	FUNC_ID_ZW_GET_RANDOM = 0x1c,
	FUNC_ID_ZW_MEMORY_GET_ID = 0x20,
	FUNC_ID_MEMORY_GET_BYTE = 0x21,
	FUNC_ID_ZW_READ_MEMORY = 0x23,
	FUNC_ID_ZW_SET_LEARN_NODE_STATE = 0x40,	// Not implemented
	FUNC_ID_ZW_GET_NODE_PROTOCOL_INFO = 0x41,	// Get protocol info (baud rate, listening, etc.) for a given node
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
	FUNC_ID_ZW_GET_SUC_NODE_ID = 0x56,	// Try to retrieve a Static Update Controller node id (zero if no SUC present)
	FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 0x5a,	// Allow options for request node neighbor update
	FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION = 0x5e,	// supports NWI
	FUNC_ID_ZW_REQUEST_NODE_INFO = 0x60,	// Get info (supported command classes) for the specified node
	FUNC_ID_ZW_REMOVE_FAILED_NODE_ID = 0x61,	// Mark a specified node id as failed
	FUNC_ID_ZW_IS_FAILED_NODE_ID = 0x62,	// Check to see if a specified node has failed
	FUNC_ID_ZW_REPLACE_FAILED_NODE = 0x63,	// Remove a failed node from the controller's list (?)
	FUNC_ID_ZW_GET_ROUTING_INFO = 0x80,	// Get a specified node's neighbor information from the controller
	FUNC_ID_SERIAL_API_SLAVE_NODE_INFO = 0xA0,	// Set application virtual slave node information
	FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 0xA1,	// Slave command handler
	FUNC_ID_ZW_SEND_SLAVE_NODE_INFO = 0xA2,	// Send a slave node information frame
	FUNC_ID_ZW_SEND_SLAVE_DATA = 0xA3,	// Send data from slave
	FUNC_ID_ZW_SET_SLAVE_LEARN_MODE = 0xA4,	// Enter slave learn mode
	FUNC_ID_ZW_GET_VIRTUAL_NODES = 0xA5,	// Return all virtual nodes
	FUNC_ID_ZW_IS_VIRTUAL_NODE = 0xA6,	// Virtual node test
	FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 0xD0,	// Set controller into promiscuous mode to listen to all frames
	FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 0xD1,
}

// =======================
// use decorators to link function types to message classes
// tslint:disable:variable-name
export const METADATA_messageTypes = Symbol("messageTypes");
export const METADATA_messageTypeMap = Symbol("messageTypeMap");
export const METADATA_expectedResponse = Symbol("expectedResponse");
// tslint:enable:variable-name

// Pre-create the lookup maps for the contructors
type MessageTypeMap = Map<string, Constructable<Frame>>;
(function initFunctionTypeMap() {
	const map: MessageTypeMap = new Map();
	Reflect.defineMetadata(METADATA_messageTypeMap, map, Frame);
})();

function getMessageTypeMapKey(frameType: FrameType, functionType: FunctionType): string {
	return JSON.stringify({frameType, functionType});
}

/**
 * Defines the frame and function type associated with a Z-Wave message
 */
export function messageTypes(frameType: FrameType, functionType: FunctionType): ClassDecorator {
	return (messageClass) => {
		// get the class constructor
		const constr = messageClass;
		log(`${constr.name}: defining frame type ${frameType} and function type ${functionType}`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_messageTypes, {frameType, functionType}, constr);

		// also store a map in the Frame metadata for lookup.
		const map: MessageTypeMap = Reflect.getMetadata(METADATA_messageTypeMap, Frame) || new Map();
		map.set(getMessageTypeMapKey(frameType, functionType), constr as any as Constructable<Frame>);
		Reflect.defineMetadata(METADATA_messageTypeMap, map, Frame);
	};
}

/**
 * Retrieves the frame type defined for a Z-Wave message class
 */
export function getFrameType<T extends Frame>(messageClass: T): FrameType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, constr);
	const ret = meta && meta.frameType;
	log(`${constr.name}: retrieving frame type => ${ret}`, "silly");
	return ret;
}

/**
 * Retrieves the frame type defined for a Z-Wave message class
 */
export function getFrameTypeStatic<T extends Constructable<Frame>>(classConstructor: T): FrameType {
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, classConstructor);
	const ret = meta && meta.frameType;
	log(`${classConstructor.name}: retrieving frame type => ${ret}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionType<T extends Frame>(messageClass: T): FunctionType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, constr);
	const ret = meta && meta.functionType;
	log(`${constr.name}: retrieving function type => ${ret}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getFunctionTypeStatic<T extends Constructable<Frame>>(classConstructor: T): FunctionType {
	// retrieve the current metadata
	const meta = Reflect.getMetadata(METADATA_messageTypes, classConstructor);
	const ret = meta && meta.functionType;
	log(`${classConstructor.name}: retrieving function type => ${ret}`, "silly");
	return ret;
}

/**
 * Looks up the message constructor for a given frame type and function type
 */
export function getFrameConstructor(frameType: FrameType, functionType: FunctionType): Constructable<Frame> {
	// also store it in the Frame class for lookup purposes
	const functionTypeMap = Reflect.getMetadata(METADATA_messageTypeMap, Frame) as MessageTypeMap;
	if (functionTypeMap != null) return functionTypeMap.get(getMessageTypeMapKey(frameType, functionType));
}

/**
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedResponse(type: FunctionType): ClassDecorator {
	return (messageClass) => {
		// get the class constructor
		const constr = messageClass.constructor;
		log(`${constr.name}: defining expected response ${type}`, "silly");
		// and store the metadata
		Reflect.defineMetadata(METADATA_expectedResponse, type, constr);
	};
}

/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export function getExpectedResponse<T extends Frame>(messageClass: T): FunctionType {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, constr);
	log(`${constr.name}: retrieving expected response => ${ret}`, "silly");
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedResponseStatic<T extends Constructable<Frame>>(classConstructor: T): FunctionType {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, classConstructor);
	log(`${classConstructor.name}: retrieving expected response => ${ret}`, "silly");
	return ret;
}
