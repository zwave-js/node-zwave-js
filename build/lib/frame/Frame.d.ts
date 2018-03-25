/// <reference types="node" />
export interface Constructable<T> {
    new (...constructorArgs: any[]): T;
}
/**
 * Represents a ZWave frame for communication with the serial interface
 */
export declare class Frame {
    constructor(payload?: Buffer);
    constructor(type: FrameType, funcType: FunctionType, expResponse: FunctionType, payload?: Buffer);
    type: FrameType;
    functionType: FunctionType;
    expectedResponse: FunctionType;
    payload: Buffer;
    /** Serializes this frame into a Buffer */
    serialize(): Buffer;
    /**
     * Deserializes a frame of this type from a Buffer
     * @returns must return the total number of bytes read
     */
    deserialize(data: Buffer): number;
}
export declare const enum FrameHeaders {
    SOF = 1,
    ACK = 6,
    NAK = 21,
    CAN = 24,
}
/** Indicates the type of a data frame */
export declare enum FrameType {
    Request = 0,
    Response = 1,
}
/**
 * Complete list of function IDs for data frames.
 * IDs started with FUNC_ID are straight from OZW and not implemented here yet
 */
export declare enum FunctionType {
    FUNC_ID_ZW_SEND_NODE_INFORMATION = 18,
    FUNC_ID_ZW_SEND_DATA = 19,
    GetControllerVersion = 21,
    FUNC_ID_ZW_R_F_POWER_LEVEL_SET = 23,
    FUNC_ID_ZW_GET_RANDOM = 28,
    FUNC_ID_ZW_MEMORY_GET_ID = 32,
    FUNC_ID_MEMORY_GET_BYTE = 33,
    FUNC_ID_ZW_READ_MEMORY = 35,
    FUNC_ID_ZW_SET_LEARN_NODE_STATE = 64,
    FUNC_ID_ZW_GET_NODE_PROTOCOL_INFO = 65,
    FUNC_ID_ZW_SET_DEFAULT = 66,
    FUNC_ID_ZW_NEW_CONTROLLER = 67,
    FUNC_ID_ZW_REPLICATION_COMMAND_COMPLETE = 68,
    FUNC_ID_ZW_REPLICATION_SEND_DATA = 69,
    FUNC_ID_ZW_ASSIGN_RETURN_ROUTE = 70,
    FUNC_ID_ZW_DELETE_RETURN_ROUTE = 71,
    FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE = 72,
    FUNC_ID_ZW_APPLICATION_UPDATE = 73,
    FUNC_ID_ZW_ADD_NODE_TO_NETWORK = 74,
    FUNC_ID_ZW_REMOVE_NODE_FROM_NETWORK = 75,
    FUNC_ID_ZW_CREATE_NEW_PRIMARY = 76,
    FUNC_ID_ZW_CONTROLLER_CHANGE = 77,
    FUNC_ID_ZW_SET_LEARN_MODE = 80,
    FUNC_ID_ZW_ASSIGN_SUC_RETURN_ROUTE = 81,
    FUNC_ID_ZW_ENABLE_SUC = 82,
    FUNC_ID_ZW_REQUEST_NETWORK_UPDATE = 83,
    FUNC_ID_ZW_SET_SUC_NODE_ID = 84,
    FUNC_ID_ZW_DELETE_SUC_RETURN_ROUTE = 85,
    FUNC_ID_ZW_GET_SUC_NODE_ID = 86,
    FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 90,
    FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION = 94,
    FUNC_ID_ZW_REQUEST_NODE_INFO = 96,
    FUNC_ID_ZW_REMOVE_FAILED_NODE_ID = 97,
    FUNC_ID_ZW_IS_FAILED_NODE_ID = 98,
    FUNC_ID_ZW_REPLACE_FAILED_NODE = 99,
    FUNC_ID_ZW_GET_ROUTING_INFO = 128,
    FUNC_ID_SERIAL_API_SLAVE_NODE_INFO = 160,
    FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 161,
    FUNC_ID_ZW_SEND_SLAVE_NODE_INFO = 162,
    FUNC_ID_ZW_SEND_SLAVE_DATA = 163,
    FUNC_ID_ZW_SET_SLAVE_LEARN_MODE = 164,
    FUNC_ID_ZW_GET_VIRTUAL_NODES = 165,
    FUNC_ID_ZW_IS_VIRTUAL_NODE = 166,
    FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 208,
    FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 209,
}
export declare const METADATA_messageTypes: unique symbol;
export declare const METADATA_messageTypeMap: unique symbol;
export declare const METADATA_expectedResponse: unique symbol;
/**
 * Defines the frame and function type associated with a Z-Wave message
 */
export declare function messageTypes(frameType: FrameType, functionType: FunctionType): ClassDecorator;
/**
 * Retrieves the frame type defined for a Z-Wave message class
 */
export declare function getFrameType<T extends Frame>(messageClass: T): FrameType;
/**
 * Retrieves the frame type defined for a Z-Wave message class
 */
export declare function getFrameTypeStatic<T extends Constructable<Frame>>(classConstructor: T): FrameType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionType<T extends Frame>(messageClass: T): FunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getFunctionTypeStatic<T extends Constructable<Frame>>(classConstructor: T): FunctionType;
/**
 * Looks up the message constructor for a given frame type and function type
 */
export declare function getFrameConstructor(frameType: FrameType, functionType: FunctionType): Constructable<Frame>;
/**
 * Defines the expected response associated with a Z-Wave message
 */
export declare function expectedResponse(type: FunctionType): ClassDecorator;
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export declare function getExpectedResponse<T extends Frame>(messageClass: T): FunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedResponseStatic<T extends Constructable<Frame>>(classConstructor: T): FunctionType;
