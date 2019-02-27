/// <reference types="node" />
import { FunctionType, MessagePriority, MessageType } from "./Constants";
export interface Constructable<T> {
    new (...constructorArgs: any[]): T;
}
/**
 * Represents a ZWave message for communication with the serial interface
 */
export declare class Message {
    constructor(payload?: Buffer);
    constructor(type: MessageType, funcType: FunctionType, expResponse: FunctionType | ResponsePredicate, payload?: Buffer);
    type: MessageType;
    functionType: FunctionType;
    expectedResponse: FunctionType | ResponsePredicate;
    payload: Buffer;
    /** Serializes this message into a Buffer */
    serialize(): Buffer;
    /**
     * Checks if there's enough data in the buffer to deserialize
     */
    static isComplete(data: Buffer): boolean;
    /**
     * Retrieves the correct constructor for the next message in the given Buffer.
     * It is assumed that the buffer has been checked beforehand
     */
    static getConstructor(data: Buffer): Constructable<Message>;
    /**
     * Deserializes a message of this type from a Buffer
     * @returns must return the total number of bytes read
     */
    deserialize(data: Buffer): number;
    /** Returns the slice of data which represents the message payload */
    static getPayload(data: Buffer): Buffer;
    toJSON(): any;
    private toJSONInternal;
    protected toJSONInherited(props: Record<string, any>): Record<string, any>;
    /** Checks if a message is an expected response for this message */
    testResponse(msg: Message): ResponseRole;
}
export declare const METADATA_messageTypes: unique symbol;
export declare const METADATA_messageTypeMap: unique symbol;
export declare const METADATA_expectedResponse: unique symbol;
export declare const METADATA_priority: unique symbol;
export declare type ResponseRole = "unexpected" | "intermediate" | "final" | "fatal_controller" | "fatal_node";
/**
 * A predicate function to test if a received message matches to the sent message
 */
export declare type ResponsePredicate = (sentMessage: Message, receivedMessage: Message) => ResponseRole;
/**
 * Defines the message and function type associated with a Z-Wave message
 */
export declare function messageTypes(messageType: MessageType, functionType: FunctionType): ClassDecorator;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export declare function getMessageType<T extends Message>(messageClass: T): MessageType;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export declare function getMessageTypeStatic<T extends Constructable<Message>>(classConstructor: T): MessageType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionType<T extends Message>(messageClass: T): FunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionTypeStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType;
/**
 * Looks up the message constructor for a given message type and function type
 */
export declare function getMessageConstructor(messageType: MessageType, functionType: FunctionType): Constructable<Message>;
/**
 * Defines the expected response associated with a Z-Wave message
 */
export declare function expectedResponse(type: FunctionType): ClassDecorator;
export declare function expectedResponse(predicate: ResponsePredicate): ClassDecorator;
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export declare function getExpectedResponse<T extends Message>(messageClass: T): FunctionType | ResponsePredicate;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedResponseStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType | ResponsePredicate;
/**
 * Defines the default priority associated with a Z-Wave message
 */
export declare function priority(prio: MessagePriority): ClassDecorator;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export declare function getDefaultPriority<T extends Message>(messageClass: T): MessagePriority;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export declare function getDefaultPriorityStatic<T extends Constructable<Message>>(classConstructor: T): MessagePriority;
