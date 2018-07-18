/// <reference types="reflect-metadata" />

import { entries } from "alcalzone-shared/objects";
import { ZWaveError, ZWaveErrorCodes } from "../error/ZWaveError";
import { log } from "../util/logger";
import { num2hex, stringify } from "../util/strings";
import { FunctionType, MessageHeaders, MessagePriority, MessageType } from "./Constants";

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
		expResponse: FunctionType | ResponsePredicate,
		payload?: Buffer,
	)

	// implementation
	constructor(
		typeOrPayload?: MessageType | Buffer,
		funcType?: FunctionType,
		expResponse?: FunctionType | ResponsePredicate,
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
	public expectedResponse: FunctionType | ResponsePredicate;
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

	/** Returns the slice of data which represents the message payload */
	public static getPayload(data: Buffer): Buffer {
		// we assume the message has been tested already for completeness
		const remainingLength = data[1];
		const messageLength = remainingLength + 2;
		const payloadLength = messageLength - 5;
		return data.slice(4, 4 + payloadLength);
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
			if (value !== undefined) ret[key] = value;
		}
		return ret;
	}

	/** Checks if a message is an expected response for this message */
	public testResponse(msg: Message): ResponseRole {
		const expected = this.expectedResponse;
		// log("driver", `Message: testing response`, "debug");
		if (
			typeof expected === "number"
			&& msg.type === MessageType.Response
		) {
			// if only a functionType was configured as expected,
			// any message with this function type is expected,
			// every other message is unexpected
			// log("driver", `  received response with fT ${msg.functionType}`, "debug");
			return expected === msg.functionType ? "final" : "unexpected";
		} else if (typeof expected === "function") {
			// If a predicate was configured, use it to test the message
			return expected(this, msg);
		}
		// nothing was configured, this expects no response
		return "unexpected";
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

// =======================
// use decorators to link function types to message classes
// tslint:disable:variable-name
export const METADATA_messageTypes = Symbol("messageTypes");
export const METADATA_messageTypeMap = Symbol("messageTypeMap");
export const METADATA_expectedResponse = Symbol("expectedResponse");
export const METADATA_priority = Symbol("priority");
// tslint:enable:variable-name

type MessageTypeMap = Map<string, Constructable<Message>>;

function getMessageTypeMapKey(messageType: MessageType, functionType: FunctionType): string {
	return JSON.stringify({ messageType, functionType });
}

export type ResponseRole =
	"unexpected" // a message that does not belong to this transaction
	| "intermediate" // an intermediate response, e.g. controller ACK that is not fatal
	| "final" // a final response (leading to a resolved transaction)
	| "fatal_controller" // a response from the controller that leads to a rejected transaction
	| "fatal_node" // a response or (lack thereof) from the node that leads to a rejected transaction
	;
/**
 * A predicate function to test if a received message matches to the sent message
 */
export type ResponsePredicate = (sentMessage: Message, receivedMessage: Message) => ResponseRole;

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
	// Retrieve the constructor map from the Message class
	const functionTypeMap = Reflect.getMetadata(METADATA_messageTypeMap, Message) as MessageTypeMap;
	if (functionTypeMap != null) return functionTypeMap.get(getMessageTypeMapKey(messageType, functionType));
}

// tslint:disable:unified-signatures
/**
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedResponse(type: FunctionType): ClassDecorator;
export function expectedResponse(predicate: ResponsePredicate): ClassDecorator;
export function expectedResponse(typeOrPredicate: FunctionType | ResponsePredicate): ClassDecorator {
	return (messageClass) => {
		if (typeof typeOrPredicate === "number") {
			const type = typeOrPredicate;
			log("protocol", `${messageClass.name}: defining expected response ${num2hex(type)}`, "silly");
		} else {
			const predicate = typeOrPredicate;
			log("protocol", `${messageClass.name}: defining expected response [Predicate${predicate.name.length > 0 ? " " + predicate.name : ""}]`, "silly");
		}
		// and store the metadata
		Reflect.defineMetadata(METADATA_expectedResponse, typeOrPredicate, messageClass);
	};
}
// tslint:enable:unified-signatures

/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export function getExpectedResponse<T extends Message>(messageClass: T): FunctionType | ResponsePredicate {
	// get the class constructor
	const constr = messageClass.constructor;
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, constr);
	if (typeof ret === "number") {
		log("protocol", `${constr.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	} else if (typeof ret === "function") {
		log("protocol", `${constr.name}: retrieving expected response => [Predicate${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
	}
	return ret;
}

/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export function getExpectedResponseStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType | ResponsePredicate {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_expectedResponse, classConstructor);
	if (typeof ret === "number") {
		log("protocol", `${classConstructor.name}: retrieving expected response => ${num2hex(ret)}`, "silly");
	} else if (typeof ret === "function") {
		log("protocol", `${classConstructor.name}: retrieving expected response => [Predicate${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
	}
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
 * Retrieves the default priority defined for a Z-Wave message class
 */
export function getDefaultPriorityStatic<T extends Constructable<Message>>(classConstructor: T): MessagePriority {
	// retrieve the current metadata
	const ret = Reflect.getMetadata(METADATA_priority, classConstructor);
	log("protocol", `${classConstructor.name}: retrieving default priority => ${MessagePriority[ret]} (${ret})`, "silly");
	return ret;
}
