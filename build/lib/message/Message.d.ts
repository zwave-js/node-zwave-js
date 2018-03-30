/// <reference types="node" />
export interface Constructable<T> {
    new (...constructorArgs: any[]): T;
}
/**
 * Represents a ZWave message for communication with the serial interface
 */
export declare class Message {
    constructor(payload?: Buffer);
    constructor(type: MessageType, funcType: FunctionType, expResponse: FunctionType, payload?: Buffer);
    type: MessageType;
    functionType: FunctionType;
    expectedResponse: FunctionType;
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
    toJSON(): any;
    private toJSONInternal();
    protected toJSONInherited(props: Record<string, any>): Record<string, any>;
}
export declare enum MessageHeaders {
    SOF = 1,
    ACK = 6,
    NAK = 21,
    CAN = 24,
}
/** Indicates the type of a data message */
export declare enum MessageType {
    Request = 0,
    Response = 1,
}
/**
 * Complete list of function IDs for data messages.
 * IDs starting with FUNC_ID are straight from OZW and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are taken from openhab-zwave and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are also taken from https://github.com/yepher/RaZBerry/blob/master/README.md and not implemented yet
 * IDs ending with UNKNOWN_<hex-code> are reported by the stick but we don't know what they mean.
 */
export declare enum FunctionType {
    GetSerialApiInitData = 2,
    FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION = 3,
    FUNC_ID_APPLICATION_COMMAND_HANDLER = 4,
    GetControllerCapabilities = 5,
    SetSerialApiTimeouts = 6,
    GetSerialApiCapabilities = 7,
    FUNC_ID_SERIAL_API_SOFT_RESET = 8,
    UNKNOWN_FUNC_UNKNOWN_0x09 = 9,
    UNKNOWN_FUNC_UNKNOWN_0x0a = 10,
    UNKNOWN_FUNC_RF_RECEIVE_MODE = 16,
    UNKNOWN_FUNC_SET_SLEEP_MODE = 17,
    FUNC_ID_ZW_SEND_NODE_INFORMATION = 18,
    FUNC_ID_ZW_SEND_DATA = 19,
    UNKNOWN_FUNC_SEND_DATA_MULTI = 20,
    GetControllerVersion = 21,
    UNKNOWN_FUNC_SEND_DATA_ABORT = 22,
    FUNC_ID_ZW_R_F_POWER_LEVEL_SET = 23,
    UNKNOWN_FUNC_SEND_DATA_META = 24,
    FUNC_ID_ZW_GET_RANDOM = 28,
    GetControllerId = 32,
    UNKNOWN_FUNC_MEMORY_GET_BYTE = 33,
    UNKNOWN_FUNC_MEMORY_PUT_BYTE = 34,
    UNKNOWN_FUNC_MEMORY_GET_BUFFER = 35,
    UNKNOWN_FUNC_MEMORY_PUT_BUFFER = 36,
    UNKNOWN_FUNC_UNKNOWN_0x27 = 39,
    UNKNOWN_FUNC_UNKNOWN_0x28 = 40,
    UNKNOWN_FUNC_UNKNOWN_0x29 = 41,
    UNKNOWN_FUNC_UNKNOWN_0x2a = 42,
    UNKNOWN_FUNC_UNKNOWN_0x2b = 43,
    UNKNOWN_FUNC_UNKNOWN_0x2c = 44,
    UNKNOWN_FUNC_UNKNOWN_0x2d = 45,
    UNKNOWN_FUNC_CLOCK_SET = 48,
    UNKNOWN_FUNC_CLOCK_GET = 49,
    UNKNOWN_FUNC_CLOCK_COMPARE = 50,
    UNKNOWN_FUNC_RTC_TIMER_CREATE = 51,
    UNKNOWN_FUNC_RTC_TIMER_READ = 52,
    UNKNOWN_FUNC_RTC_TIMER_DELETE = 53,
    UNKNOWN_FUNC_RTC_TIMER_CALL = 54,
    FUNC_ID_ZW_SET_LEARN_NODE_STATE = 64,
    GetNodeProtocolInfo = 65,
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
    GetSUCNodeId = 86,
    UNKNOWN_FUNC_SEND_SUC_ID = 87,
    UNKNOWN_FUNC_REDISCOVERY_NEEDED = 89,
    FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS = 90,
    FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION = 94,
    FUNC_ID_ZW_REQUEST_NODE_INFO = 96,
    FUNC_ID_ZW_REMOVE_FAILED_NODE_ID = 97,
    FUNC_ID_ZW_IS_FAILED_NODE_ID = 98,
    FUNC_ID_ZW_REPLACE_FAILED_NODE = 99,
    UNKNOWN_FUNC_UNKNOWN_0x66 = 102,
    UNKNOWN_FUNC_UNKNOWN_0x67 = 103,
    UNKNOWN_FUNC_TIMER_START = 112,
    UNKNOWN_FUNC_TIMER_RESTART = 113,
    UNKNOWN_FUNC_TIMER_CANCEL = 114,
    UNKNOWN_FUNC_TIMER_CALL = 115,
    UNKNOWN_FUNC_UNKNOWN_0x78 = 120,
    FUNC_ID_ZW_GET_ROUTING_INFO = 128,
    UNKNOWN_FUNC_GetRoutingTableLine = 128,
    UNKNOWN_FUNC_GetTXCounter = 129,
    UNKNOWN_FUNC_ResetTXCounter = 130,
    UNKNOWN_FUNC_StoreNodeInfo = 131,
    UNKNOWN_FUNC_StoreHomeId = 132,
    UNKNOWN_FUNC_LOCK_ROUTE_RESPONSE = 144,
    UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO = 145,
    UNKNOWN_FUNC_UNKNOWN_0x92 = 146,
    UNKNOWN_FUNC_UNKNOWN_0x93 = 147,
    UNKNOWN_FUNC_SERIAL_API_TEST = 149,
    UNKNOWN_FUNC_UNKNOWN_0x98 = 152,
    FUNC_ID_SERIAL_API_SLAVE_NODE_INFO = 160,
    FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER = 161,
    FUNC_ID_ZW_SEND_SLAVE_NODE_INFO = 162,
    FUNC_ID_ZW_SEND_SLAVE_DATA = 163,
    FUNC_ID_ZW_SET_SLAVE_LEARN_MODE = 164,
    FUNC_ID_ZW_GET_VIRTUAL_NODES = 165,
    FUNC_ID_ZW_IS_VIRTUAL_NODE = 166,
    UNKNOWN_FUNC_UNKNOWN_0xB4 = 180,
    UNKNOWN_FUNC_WATCH_DOG_ENABLE = 182,
    UNKNOWN_FUNC_WATCH_DOG_DISABLE = 183,
    UNKNOWN_FUNC_WATCH_DOG_KICK = 184,
    UNKNOWN_FUNC_UNKNOWN_0xB9 = 185,
    UNKNOWN_FUNC_RF_POWERLEVEL_GET = 186,
    UNKNOWN_FUNC_GET_LIBRARY_TYPE = 189,
    UNKNOWN_FUNC_SEND_TEST_FRAME = 190,
    UNKNOWN_FUNC_GET_PROTOCOL_STATUS = 191,
    FUNC_ID_ZW_SET_PROMISCUOUS_MODE = 208,
    FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER = 209,
    UNKNOWN_FUNC_UNKNOWN_0xD2 = 210,
    UNKNOWN_FUNC_UNKNOWN_0xD3 = 211,
    UNKNOWN_FUNC_UNKNOWN_0xD4 = 212,
    UNKNOWN_FUNC_UNKNOWN_0xEF = 239,
    UNKNOWN_FUNC_UNKNOWN_0xF2 = 242,
    UNKNOWN_FUNC_UNKNOWN_0xF4 = 244,
    UNKNOWN_FUNC_UNKNOWN_0xF5 = 245,
}
export declare const METADATA_messageTypes: unique symbol;
export declare const METADATA_messageTypeMap: unique symbol;
export declare const METADATA_expectedResponse: unique symbol;
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
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
export declare function getExpectedResponse<T extends Message>(messageClass: T): FunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
export declare function getExpectedResponseStatic<T extends Constructable<Message>>(classConstructor: T): FunctionType;
