/// <reference types="node" />
import { IZWaveNode, MessageOrCCLogEntry, MessagePriority } from "@zwave-js/core";
import type { ZWaveApplicationHost, ZWaveHost } from "@zwave-js/host";
import type { JSONObject, TypedClassDecorator } from "@zwave-js/shared/safe";
import { FunctionType, MessageType } from "./Constants";
export type MessageConstructor<T extends Message> = new (host: ZWaveHost, options?: MessageOptions) => T;
export type DeserializingMessageConstructor<T extends Message> = new (host: ZWaveHost, options: MessageDeserializationOptions) => T;
/** Where a serialized message originates from, to distinguish how certain messages need to be deserialized */
export declare enum MessageOrigin {
    Controller = 0,
    Host = 1
}
export interface MessageDeserializationOptions {
    data: Buffer;
    origin?: MessageOrigin;
    /** Whether CCs should be parsed immediately (only affects messages that contain CCs). Default: `true` */
    parseCCs?: boolean;
    /** If known already, this contains the SDK version of the stick which can be used to interpret payloads differently */
    sdkVersion?: string;
}
/**
 * Tests whether the given message constructor options contain a buffer for deserialization
 */
export declare function gotDeserializationOptions(options: Record<any, any> | undefined): options is MessageDeserializationOptions;
export interface MessageBaseOptions {
    callbackId?: number;
}
export interface MessageCreationOptions extends MessageBaseOptions {
    type?: MessageType;
    functionType?: FunctionType;
    expectedResponse?: FunctionType | typeof Message | ResponsePredicate;
    expectedCallback?: FunctionType | typeof Message | ResponsePredicate;
    payload?: Buffer;
}
export type MessageOptions = MessageCreationOptions | MessageDeserializationOptions;
/**
 * Represents a Z-Wave message for communication with the serial interface
 */
export declare class Message {
    protected host: ZWaveHost;
    constructor(host: ZWaveHost, options?: MessageOptions);
    type: MessageType;
    functionType: FunctionType;
    expectedResponse: FunctionType | typeof Message | ResponsePredicate | undefined;
    expectedCallback: FunctionType | typeof Message | ResponsePredicate | undefined;
    payload: Buffer;
    private _callbackId;
    /**
     * Used to map requests to responses.
     *
     * WARNING: Accessing this property will generate a new callback ID if this message had none.
     * If you want to compare the callback ID, use `hasCallbackId()` beforehand to check if the callback ID is already defined.
     */
    get callbackId(): number;
    set callbackId(v: number | undefined);
    /**
     * Tests whether this message's callback ID is defined
     */
    hasCallbackId(): boolean;
    /**
     * Tests whether this message needs a callback ID to match its response
     */
    needsCallbackId(): boolean;
    /** Returns the response timeout for this message in case the default settings do not apply. */
    getResponseTimeout(): number | undefined;
    /** Returns the callback timeout for this message in case the default settings do not apply. */
    getCallbackTimeout(): number | undefined;
    /** Serializes this message into a Buffer */
    serialize(): Buffer;
    /** Returns the number of bytes the first message in the buffer occupies */
    static getMessageLength(data: Buffer): number;
    /**
     * Checks if there's enough data in the buffer to deserialize
     */
    static isComplete(data?: Buffer): boolean;
    /**
     * Retrieves the correct constructor for the next message in the given Buffer.
     * It is assumed that the buffer has been checked beforehand
     */
    static getConstructor(data: Buffer): MessageConstructor<Message>;
    /** Creates an instance of the message that is serialized in the given buffer */
    static from(host: ZWaveHost, options: MessageDeserializationOptions): Message;
    /** Returns the slice of data which represents the message payload */
    static extractPayload(data: Buffer): Buffer;
    /** Generates a representation of this Message for the log */
    toLogEntry(): MessageOrCCLogEntry;
    /** Generates the JSON representation of this Message */
    toJSON(): JSONObject;
    private toJSONInternal;
    private testMessage;
    /** Tests whether this message expects a response from the controller */
    expectsResponse(): boolean;
    /** Tests whether this message expects a callback from the controller */
    expectsCallback(): boolean;
    /** Tests whether this message expects an update from the target node to finalize the transaction */
    expectsNodeUpdate(): boolean;
    /** Checks if a message is an expected response for this message */
    isExpectedResponse(msg: Message): boolean;
    /** Checks if a message is an expected callback for this message */
    isExpectedCallback(msg: Message): boolean;
    /** Checks if a message is an expected node update for this message */
    isExpectedNodeUpdate(msg: Message): boolean;
    /** Gets set by the driver to remember an expected node update for this message that arrived before the Serial API command has finished. */
    prematureNodeUpdate: Message | undefined;
    /** Finds the ID of the target or source node in a message, if it contains that information */
    getNodeId(): number | undefined;
    /**
     * Returns the node this message is linked to or undefined
     */
    getNodeUnsafe(applHost: ZWaveApplicationHost): IZWaveNode | undefined;
    private _transmissionTimestamp;
    /** The timestamp when this message was (last) transmitted (in nanoseconds) */
    get transmissionTimestamp(): number | undefined;
    /** Marks this message as sent and sets the transmission timestamp */
    markAsSent(): void;
    private _completedTimestamp;
    get completedTimestamp(): number | undefined;
    /** Marks this message as completed and sets the corresponding timestamp */
    markAsCompleted(): void;
    /** Returns the round trip time of this message from transmission until completion. */
    get rtt(): number | undefined;
}
export type ResponseRole = "unexpected" | "confirmation" | "final" | "fatal_controller" | "fatal_node";
/**
 * A predicate function to test if a received message matches to the sent message
 */
export type ResponsePredicate<TSent extends Message = Message> = (sentMessage: TSent, receivedMessage: Message) => boolean;
/**
 * Defines the message and function type associated with a Z-Wave message
 */
export declare const messageTypes: <TTarget extends Message>(messageType: MessageType, functionType: FunctionType) => TypedClassDecorator<TTarget>;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export declare function getMessageType<T extends Message>(messageClass: T): MessageType | undefined;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
export declare function getMessageTypeStatic<T extends MessageConstructor<Message>>(classConstructor: T): MessageType | undefined;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionType<T extends Message>(messageClass: T): FunctionType | undefined;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionTypeStatic<T extends MessageConstructor<Message>>(classConstructor: T): FunctionType | undefined;
/**
 * Defines the expected response function type or message class for a Z-Wave message
 */
export declare const expectedResponse: <TTarget extends Message>(typeOrPredicate: FunctionType | typeof Message | ResponsePredicate<Message>) => TypedClassDecorator<TTarget>;
/**
 * Retrieves the expected response function type or message class defined for a Z-Wave message class
 */
export declare function getExpectedResponse<T extends Message>(messageClass: T): FunctionType | typeof Message | ResponsePredicate | undefined;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedResponseStatic<T extends MessageConstructor<Message>>(classConstructor: T): FunctionType | typeof Message | ResponsePredicate | undefined;
/**
 * Defines the expected callback function type or message class for a Z-Wave message
 */
export declare function expectedCallback<TSent extends Message>(typeOrPredicate: FunctionType | typeof Message | ResponsePredicate<TSent>): TypedClassDecorator<Message>;
/**
 * Retrieves the expected callback function type or message class defined for a Z-Wave message class
 */
export declare function getExpectedCallback<T extends Message>(messageClass: T): FunctionType | typeof Message | ResponsePredicate | undefined;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedCallbackStatic<T extends MessageConstructor<Message>>(classConstructor: T): FunctionType | typeof Message | ResponsePredicate | undefined;
/**
 * Defines the default priority associated with a Z-Wave message
 */
export declare const priority: <TTarget extends Message>(prio: MessagePriority) => TypedClassDecorator<TTarget>;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export declare function getDefaultPriority<T extends Message>(messageClass: T): MessagePriority | undefined;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
export declare function getDefaultPriorityStatic<T extends MessageConstructor<Message>>(classConstructor: T): MessagePriority | undefined;
//# sourceMappingURL=Message.d.ts.map