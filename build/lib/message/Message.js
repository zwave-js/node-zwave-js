"use strict";
/// <reference types="reflect-metadata" />
Object.defineProperty(exports, "__esModule", { value: true });
const ZWaveError_1 = require("../error/ZWaveError");
const logger_1 = require("../util/logger");
const object_polyfill_1 = require("../util/object-polyfill");
const strings_1 = require("../util/strings");
/**
 * Represents a ZWave message for communication with the serial interface
 */
class Message {
    // implementation
    constructor(typeOrPayload, funcType, expResponse, payload) {
        // decide which implementation we follow
        let type;
        if (typeof typeOrPayload === "number") {
            type = typeOrPayload;
        }
        else if (typeOrPayload instanceof Buffer) {
            payload = typeOrPayload;
        }
        // These properties are filled from declared metadata if not provided
        this.type = type != null ? type : getMessageType(this);
        this.functionType = funcType != null ? funcType : getFunctionType(this);
        this.expectedResponse = expResponse != null ? expResponse : getExpectedResponse(this);
        // This is taken from the constructor args
        this.payload = payload;
    }
    /** Serializes this message into a Buffer */
    serialize() {
        const payloadLength = this.payload != null ? this.payload.length : 0;
        const ret = Buffer.allocUnsafe(payloadLength + 5);
        ret[0] = MessageHeaders.SOF;
        // length of the following data, including the checksum
        ret[1] = payloadLength + 3;
        // write the remaining data
        ret[2] = this.type;
        ret[3] = this.functionType;
        if (this.payload != null)
            this.payload.copy(ret, 4);
        // followed by the checksum
        ret[ret.length - 1] = computeChecksum(ret);
        return ret;
    }
    /**
     * Checks if there's enough data in the buffer to deserialize
     */
    static isComplete(data) {
        if (!data || !data.length || data.length < 5)
            return false; // not yet
        // check the length again, this time with the transmitted length
        const remainingLength = data[1];
        const messageLength = remainingLength + 2;
        if (data.length < messageLength)
            return false; // not yet
        return true; // probably, but the checksum may be wrong
    }
    /**
     * Retrieves the correct constructor for the next message in the given Buffer.
     * It is assumed that the buffer has been checked beforehand
     */
    static getConstructor(data) {
        return getMessageConstructor(data[2], data[3]) || Message;
    }
    /**
     * Deserializes a message of this type from a Buffer
     * @returns must return the total number of bytes read
     */
    deserialize(data) {
        // SOF, length, type, commandId and checksum must be present
        if (!data || !data.length || data.length < 5) {
            throw new ZWaveError_1.ZWaveError("Could not deserialize the message because it was truncated", ZWaveError_1.ZWaveErrorCodes.PacketFormat_Truncated);
        }
        // the packet has to start with SOF
        if (data[0] !== MessageHeaders.SOF) {
            throw new ZWaveError_1.ZWaveError("Could not deserialize the message because it does not start with SOF", ZWaveError_1.ZWaveErrorCodes.PacketFormat_Invalid);
        }
        // check the length again, this time with the transmitted length
        const remainingLength = data[1];
        const messageLength = remainingLength + 2;
        if (data.length < messageLength) {
            throw new ZWaveError_1.ZWaveError("Could not deserialize the message because it was truncated", ZWaveError_1.ZWaveErrorCodes.PacketFormat_Truncated);
        }
        // check the checksum
        const expectedChecksum = computeChecksum(data.slice(0, messageLength));
        if (data[messageLength - 1] !== expectedChecksum) {
            throw new ZWaveError_1.ZWaveError("Could not deserialize the message because the checksum didn't match", ZWaveError_1.ZWaveErrorCodes.PacketFormat_Checksum);
        }
        this.type = data[2];
        this.functionType = data[3];
        const payloadLength = messageLength - 5;
        this.payload = data.slice(4, 4 + payloadLength);
        // return the total number of bytes in this message
        return messageLength;
    }
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            name: this.constructor.name,
            type: MessageType[this.type],
            functionType: FunctionType[this.functionType] || strings_1.num2hex(this.functionType),
        };
        if (this.expectedResponse != null)
            ret.expectedResponse = FunctionType[this.functionType];
        if (this.payload != null)
            ret.payload = this.payload.toString("hex");
        return ret;
    }
    toJSONInherited(props) {
        const ret = this.toJSONInternal();
        delete ret.payload;
        for (const [key, value] of object_polyfill_1.entries(props)) {
            ret[key] = value;
        }
        return ret;
    }
}
exports.Message = Message;
function computeChecksum(message) {
    let ret = 0xff;
    // exclude SOF and checksum byte from the computation
    for (let i = 1; i < message.length - 1; i++) {
        ret ^= message[i];
    }
    return ret;
}
var MessageHeaders;
(function (MessageHeaders) {
    MessageHeaders[MessageHeaders["SOF"] = 1] = "SOF";
    MessageHeaders[MessageHeaders["ACK"] = 6] = "ACK";
    MessageHeaders[MessageHeaders["NAK"] = 21] = "NAK";
    MessageHeaders[MessageHeaders["CAN"] = 24] = "CAN";
})(MessageHeaders = exports.MessageHeaders || (exports.MessageHeaders = {}));
/** Indicates the type of a data message */
var MessageType;
(function (MessageType) {
    MessageType[MessageType["Request"] = 0] = "Request";
    MessageType[MessageType["Response"] = 1] = "Response";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
/**
 * Complete list of function IDs for data messages.
 * IDs starting with FUNC_ID are straight from OZW and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are taken from openhab-zwave and not implemented here yet.
 * IDs starting with UNKNOWN_FUNC are also taken from https://github.com/yepher/RaZBerry/blob/master/README.md and not implemented yet
 * IDs ending with UNKNOWN_<hex-code> are reported by the stick but we don't know what they mean.
 */
var FunctionType;
(function (FunctionType) {
    FunctionType[FunctionType["GetSerialApiInitData"] = 2] = "GetSerialApiInitData";
    FunctionType[FunctionType["FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION"] = 3] = "FUNC_ID_SERIAL_API_APPL_NODE_INFORMATION";
    FunctionType[FunctionType["FUNC_ID_APPLICATION_COMMAND_HANDLER"] = 4] = "FUNC_ID_APPLICATION_COMMAND_HANDLER";
    FunctionType[FunctionType["GetControllerCapabilities"] = 5] = "GetControllerCapabilities";
    FunctionType[FunctionType["SetSerialApiTimeouts"] = 6] = "SetSerialApiTimeouts";
    FunctionType[FunctionType["GetSerialApiCapabilities"] = 7] = "GetSerialApiCapabilities";
    FunctionType[FunctionType["FUNC_ID_SERIAL_API_SOFT_RESET"] = 8] = "FUNC_ID_SERIAL_API_SOFT_RESET";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x09"] = 9] = "UNKNOWN_FUNC_UNKNOWN_0x09";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x0a"] = 10] = "UNKNOWN_FUNC_UNKNOWN_0x0a";
    FunctionType[FunctionType["UNKNOWN_FUNC_RF_RECEIVE_MODE"] = 16] = "UNKNOWN_FUNC_RF_RECEIVE_MODE";
    FunctionType[FunctionType["UNKNOWN_FUNC_SET_SLEEP_MODE"] = 17] = "UNKNOWN_FUNC_SET_SLEEP_MODE";
    FunctionType[FunctionType["FUNC_ID_ZW_SEND_NODE_INFORMATION"] = 18] = "FUNC_ID_ZW_SEND_NODE_INFORMATION";
    FunctionType[FunctionType["FUNC_ID_ZW_SEND_DATA"] = 19] = "FUNC_ID_ZW_SEND_DATA";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_DATA_MULTI"] = 20] = "UNKNOWN_FUNC_SEND_DATA_MULTI";
    FunctionType[FunctionType["GetControllerVersion"] = 21] = "GetControllerVersion";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_DATA_ABORT"] = 22] = "UNKNOWN_FUNC_SEND_DATA_ABORT";
    FunctionType[FunctionType["FUNC_ID_ZW_R_F_POWER_LEVEL_SET"] = 23] = "FUNC_ID_ZW_R_F_POWER_LEVEL_SET";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_DATA_META"] = 24] = "UNKNOWN_FUNC_SEND_DATA_META";
    FunctionType[FunctionType["FUNC_ID_ZW_GET_RANDOM"] = 28] = "FUNC_ID_ZW_GET_RANDOM";
    FunctionType[FunctionType["GetControllerId"] = 32] = "GetControllerId";
    FunctionType[FunctionType["UNKNOWN_FUNC_MEMORY_GET_BYTE"] = 33] = "UNKNOWN_FUNC_MEMORY_GET_BYTE";
    FunctionType[FunctionType["UNKNOWN_FUNC_MEMORY_PUT_BYTE"] = 34] = "UNKNOWN_FUNC_MEMORY_PUT_BYTE";
    FunctionType[FunctionType["UNKNOWN_FUNC_MEMORY_GET_BUFFER"] = 35] = "UNKNOWN_FUNC_MEMORY_GET_BUFFER";
    FunctionType[FunctionType["UNKNOWN_FUNC_MEMORY_PUT_BUFFER"] = 36] = "UNKNOWN_FUNC_MEMORY_PUT_BUFFER";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x27"] = 39] = "UNKNOWN_FUNC_UNKNOWN_0x27";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x28"] = 40] = "UNKNOWN_FUNC_UNKNOWN_0x28";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x29"] = 41] = "UNKNOWN_FUNC_UNKNOWN_0x29";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x2a"] = 42] = "UNKNOWN_FUNC_UNKNOWN_0x2a";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x2b"] = 43] = "UNKNOWN_FUNC_UNKNOWN_0x2b";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x2c"] = 44] = "UNKNOWN_FUNC_UNKNOWN_0x2c";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x2d"] = 45] = "UNKNOWN_FUNC_UNKNOWN_0x2d";
    FunctionType[FunctionType["UNKNOWN_FUNC_CLOCK_SET"] = 48] = "UNKNOWN_FUNC_CLOCK_SET";
    FunctionType[FunctionType["UNKNOWN_FUNC_CLOCK_GET"] = 49] = "UNKNOWN_FUNC_CLOCK_GET";
    FunctionType[FunctionType["UNKNOWN_FUNC_CLOCK_COMPARE"] = 50] = "UNKNOWN_FUNC_CLOCK_COMPARE";
    FunctionType[FunctionType["UNKNOWN_FUNC_RTC_TIMER_CREATE"] = 51] = "UNKNOWN_FUNC_RTC_TIMER_CREATE";
    FunctionType[FunctionType["UNKNOWN_FUNC_RTC_TIMER_READ"] = 52] = "UNKNOWN_FUNC_RTC_TIMER_READ";
    FunctionType[FunctionType["UNKNOWN_FUNC_RTC_TIMER_DELETE"] = 53] = "UNKNOWN_FUNC_RTC_TIMER_DELETE";
    FunctionType[FunctionType["UNKNOWN_FUNC_RTC_TIMER_CALL"] = 54] = "UNKNOWN_FUNC_RTC_TIMER_CALL";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_LEARN_NODE_STATE"] = 64] = "FUNC_ID_ZW_SET_LEARN_NODE_STATE";
    FunctionType[FunctionType["GetNodeProtocolInfo"] = 65] = "GetNodeProtocolInfo";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_DEFAULT"] = 66] = "FUNC_ID_ZW_SET_DEFAULT";
    FunctionType[FunctionType["FUNC_ID_ZW_NEW_CONTROLLER"] = 67] = "FUNC_ID_ZW_NEW_CONTROLLER";
    FunctionType[FunctionType["FUNC_ID_ZW_REPLICATION_COMMAND_COMPLETE"] = 68] = "FUNC_ID_ZW_REPLICATION_COMMAND_COMPLETE";
    FunctionType[FunctionType["FUNC_ID_ZW_REPLICATION_SEND_DATA"] = 69] = "FUNC_ID_ZW_REPLICATION_SEND_DATA";
    FunctionType[FunctionType["FUNC_ID_ZW_ASSIGN_RETURN_ROUTE"] = 70] = "FUNC_ID_ZW_ASSIGN_RETURN_ROUTE";
    FunctionType[FunctionType["FUNC_ID_ZW_DELETE_RETURN_ROUTE"] = 71] = "FUNC_ID_ZW_DELETE_RETURN_ROUTE";
    FunctionType[FunctionType["FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE"] = 72] = "FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE";
    FunctionType[FunctionType["FUNC_ID_ZW_APPLICATION_UPDATE"] = 73] = "FUNC_ID_ZW_APPLICATION_UPDATE";
    FunctionType[FunctionType["FUNC_ID_ZW_ADD_NODE_TO_NETWORK"] = 74] = "FUNC_ID_ZW_ADD_NODE_TO_NETWORK";
    FunctionType[FunctionType["FUNC_ID_ZW_REMOVE_NODE_FROM_NETWORK"] = 75] = "FUNC_ID_ZW_REMOVE_NODE_FROM_NETWORK";
    FunctionType[FunctionType["FUNC_ID_ZW_CREATE_NEW_PRIMARY"] = 76] = "FUNC_ID_ZW_CREATE_NEW_PRIMARY";
    FunctionType[FunctionType["FUNC_ID_ZW_CONTROLLER_CHANGE"] = 77] = "FUNC_ID_ZW_CONTROLLER_CHANGE";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_LEARN_MODE"] = 80] = "FUNC_ID_ZW_SET_LEARN_MODE";
    FunctionType[FunctionType["FUNC_ID_ZW_ASSIGN_SUC_RETURN_ROUTE"] = 81] = "FUNC_ID_ZW_ASSIGN_SUC_RETURN_ROUTE";
    FunctionType[FunctionType["FUNC_ID_ZW_ENABLE_SUC"] = 82] = "FUNC_ID_ZW_ENABLE_SUC";
    FunctionType[FunctionType["FUNC_ID_ZW_REQUEST_NETWORK_UPDATE"] = 83] = "FUNC_ID_ZW_REQUEST_NETWORK_UPDATE";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_SUC_NODE_ID"] = 84] = "FUNC_ID_ZW_SET_SUC_NODE_ID";
    FunctionType[FunctionType["FUNC_ID_ZW_DELETE_SUC_RETURN_ROUTE"] = 85] = "FUNC_ID_ZW_DELETE_SUC_RETURN_ROUTE";
    FunctionType[FunctionType["GetSUCNodeId"] = 86] = "GetSUCNodeId";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_SUC_ID"] = 87] = "UNKNOWN_FUNC_SEND_SUC_ID";
    FunctionType[FunctionType["UNKNOWN_FUNC_REDISCOVERY_NEEDED"] = 89] = "UNKNOWN_FUNC_REDISCOVERY_NEEDED";
    FunctionType[FunctionType["FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS"] = 90] = "FUNC_ID_ZW_REQUEST_NODE_NEIGHBOR_UPDATE_OPTIONS";
    FunctionType[FunctionType["FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION"] = 94] = "FUNC_ID_ZW_EXPLORE_REQUEST_INCLUSION";
    FunctionType[FunctionType["FUNC_ID_ZW_REQUEST_NODE_INFO"] = 96] = "FUNC_ID_ZW_REQUEST_NODE_INFO";
    FunctionType[FunctionType["FUNC_ID_ZW_REMOVE_FAILED_NODE_ID"] = 97] = "FUNC_ID_ZW_REMOVE_FAILED_NODE_ID";
    FunctionType[FunctionType["FUNC_ID_ZW_IS_FAILED_NODE_ID"] = 98] = "FUNC_ID_ZW_IS_FAILED_NODE_ID";
    FunctionType[FunctionType["FUNC_ID_ZW_REPLACE_FAILED_NODE"] = 99] = "FUNC_ID_ZW_REPLACE_FAILED_NODE";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x66"] = 102] = "UNKNOWN_FUNC_UNKNOWN_0x66";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x67"] = 103] = "UNKNOWN_FUNC_UNKNOWN_0x67";
    FunctionType[FunctionType["UNKNOWN_FUNC_TIMER_START"] = 112] = "UNKNOWN_FUNC_TIMER_START";
    FunctionType[FunctionType["UNKNOWN_FUNC_TIMER_RESTART"] = 113] = "UNKNOWN_FUNC_TIMER_RESTART";
    FunctionType[FunctionType["UNKNOWN_FUNC_TIMER_CANCEL"] = 114] = "UNKNOWN_FUNC_TIMER_CANCEL";
    FunctionType[FunctionType["UNKNOWN_FUNC_TIMER_CALL"] = 115] = "UNKNOWN_FUNC_TIMER_CALL";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x78"] = 120] = "UNKNOWN_FUNC_UNKNOWN_0x78";
    FunctionType[FunctionType["FUNC_ID_ZW_GET_ROUTING_INFO"] = 128] = "FUNC_ID_ZW_GET_ROUTING_INFO";
    FunctionType[FunctionType["UNKNOWN_FUNC_GetRoutingTableLine"] = 128] = "UNKNOWN_FUNC_GetRoutingTableLine";
    FunctionType[FunctionType["UNKNOWN_FUNC_GetTXCounter"] = 129] = "UNKNOWN_FUNC_GetTXCounter";
    FunctionType[FunctionType["UNKNOWN_FUNC_ResetTXCounter"] = 130] = "UNKNOWN_FUNC_ResetTXCounter";
    FunctionType[FunctionType["UNKNOWN_FUNC_StoreNodeInfo"] = 131] = "UNKNOWN_FUNC_StoreNodeInfo";
    FunctionType[FunctionType["UNKNOWN_FUNC_StoreHomeId"] = 132] = "UNKNOWN_FUNC_StoreHomeId";
    FunctionType[FunctionType["UNKNOWN_FUNC_LOCK_ROUTE_RESPONSE"] = 144] = "UNKNOWN_FUNC_LOCK_ROUTE_RESPONSE";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO"] = 145] = "UNKNOWN_FUNC_SEND_DATA_ROUTE_DEMO";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x92"] = 146] = "UNKNOWN_FUNC_UNKNOWN_0x92";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x93"] = 147] = "UNKNOWN_FUNC_UNKNOWN_0x93";
    FunctionType[FunctionType["UNKNOWN_FUNC_SERIAL_API_TEST"] = 149] = "UNKNOWN_FUNC_SERIAL_API_TEST";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0x98"] = 152] = "UNKNOWN_FUNC_UNKNOWN_0x98";
    FunctionType[FunctionType["FUNC_ID_SERIAL_API_SLAVE_NODE_INFO"] = 160] = "FUNC_ID_SERIAL_API_SLAVE_NODE_INFO";
    FunctionType[FunctionType["FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER"] = 161] = "FUNC_ID_APPLICATION_SLAVE_COMMAND_HANDLER";
    FunctionType[FunctionType["FUNC_ID_ZW_SEND_SLAVE_NODE_INFO"] = 162] = "FUNC_ID_ZW_SEND_SLAVE_NODE_INFO";
    FunctionType[FunctionType["FUNC_ID_ZW_SEND_SLAVE_DATA"] = 163] = "FUNC_ID_ZW_SEND_SLAVE_DATA";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_SLAVE_LEARN_MODE"] = 164] = "FUNC_ID_ZW_SET_SLAVE_LEARN_MODE";
    FunctionType[FunctionType["FUNC_ID_ZW_GET_VIRTUAL_NODES"] = 165] = "FUNC_ID_ZW_GET_VIRTUAL_NODES";
    FunctionType[FunctionType["FUNC_ID_ZW_IS_VIRTUAL_NODE"] = 166] = "FUNC_ID_ZW_IS_VIRTUAL_NODE";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xB4"] = 180] = "UNKNOWN_FUNC_UNKNOWN_0xB4";
    FunctionType[FunctionType["UNKNOWN_FUNC_WATCH_DOG_ENABLE"] = 182] = "UNKNOWN_FUNC_WATCH_DOG_ENABLE";
    FunctionType[FunctionType["UNKNOWN_FUNC_WATCH_DOG_DISABLE"] = 183] = "UNKNOWN_FUNC_WATCH_DOG_DISABLE";
    FunctionType[FunctionType["UNKNOWN_FUNC_WATCH_DOG_KICK"] = 184] = "UNKNOWN_FUNC_WATCH_DOG_KICK";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xB9"] = 185] = "UNKNOWN_FUNC_UNKNOWN_0xB9";
    FunctionType[FunctionType["UNKNOWN_FUNC_RF_POWERLEVEL_GET"] = 186] = "UNKNOWN_FUNC_RF_POWERLEVEL_GET";
    FunctionType[FunctionType["UNKNOWN_FUNC_GET_LIBRARY_TYPE"] = 189] = "UNKNOWN_FUNC_GET_LIBRARY_TYPE";
    FunctionType[FunctionType["UNKNOWN_FUNC_SEND_TEST_FRAME"] = 190] = "UNKNOWN_FUNC_SEND_TEST_FRAME";
    FunctionType[FunctionType["UNKNOWN_FUNC_GET_PROTOCOL_STATUS"] = 191] = "UNKNOWN_FUNC_GET_PROTOCOL_STATUS";
    FunctionType[FunctionType["FUNC_ID_ZW_SET_PROMISCUOUS_MODE"] = 208] = "FUNC_ID_ZW_SET_PROMISCUOUS_MODE";
    FunctionType[FunctionType["FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER"] = 209] = "FUNC_ID_PROMISCUOUS_APPLICATION_COMMAND_HANDLER";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xD2"] = 210] = "UNKNOWN_FUNC_UNKNOWN_0xD2";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xD3"] = 211] = "UNKNOWN_FUNC_UNKNOWN_0xD3";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xD4"] = 212] = "UNKNOWN_FUNC_UNKNOWN_0xD4";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xEF"] = 239] = "UNKNOWN_FUNC_UNKNOWN_0xEF";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xF2"] = 242] = "UNKNOWN_FUNC_UNKNOWN_0xF2";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xF4"] = 244] = "UNKNOWN_FUNC_UNKNOWN_0xF4";
    FunctionType[FunctionType["UNKNOWN_FUNC_UNKNOWN_0xF5"] = 245] = "UNKNOWN_FUNC_UNKNOWN_0xF5";
})(FunctionType = exports.FunctionType || (exports.FunctionType = {}));
// =======================
// use decorators to link function types to message classes
// tslint:disable:variable-name
exports.METADATA_messageTypes = Symbol("messageTypes");
exports.METADATA_messageTypeMap = Symbol("messageTypeMap");
exports.METADATA_expectedResponse = Symbol("expectedResponse");
function getMessageTypeMapKey(messageType, functionType) {
    return JSON.stringify({ messageType, functionType });
}
/**
 * Defines the message and function type associated with a Z-Wave message
 */
function messageTypes(messageType, functionType) {
    return (messageClass) => {
        logger_1.log("protocol", `${messageClass.name}: defining message type ${strings_1.num2hex(messageType)} and function type ${strings_1.num2hex(functionType)}`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_messageTypes, { messageType, functionType }, messageClass);
        // also store a map in the Message metadata for lookup.
        const map = Reflect.getMetadata(exports.METADATA_messageTypeMap, Message) || new Map();
        map.set(getMessageTypeMapKey(messageType, functionType), messageClass);
        Reflect.defineMetadata(exports.METADATA_messageTypeMap, map, Message);
    };
}
exports.messageTypes = messageTypes;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
function getMessageType(messageClass) {
    // get the class constructor
    const constr = messageClass.constructor;
    // retrieve the current metadata
    const meta = Reflect.getMetadata(exports.METADATA_messageTypes, constr);
    const ret = meta && meta.messageType;
    logger_1.log("protocol", `${constr.name}: retrieving message type => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getMessageType = getMessageType;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
function getMessageTypeStatic(classConstructor) {
    // retrieve the current metadata
    const meta = Reflect.getMetadata(exports.METADATA_messageTypes, classConstructor);
    const ret = meta && meta.messageType;
    logger_1.log("protocol", `${classConstructor.name}: retrieving message type => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getMessageTypeStatic = getMessageTypeStatic;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getFunctionType(messageClass) {
    // get the class constructor
    const constr = messageClass.constructor;
    // retrieve the current metadata
    const meta = Reflect.getMetadata(exports.METADATA_messageTypes, constr);
    const ret = meta && meta.functionType;
    logger_1.log("protocol", `${constr.name}: retrieving function type => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getFunctionType = getFunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getFunctionTypeStatic(classConstructor) {
    // retrieve the current metadata
    const meta = Reflect.getMetadata(exports.METADATA_messageTypes, classConstructor);
    const ret = meta && meta.functionType;
    logger_1.log("protocol", `${classConstructor.name}: retrieving function type => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getFunctionTypeStatic = getFunctionTypeStatic;
/**
 * Looks up the message constructor for a given message type and function type
 */
function getMessageConstructor(messageType, functionType) {
    // also store it in the Message class for lookup purposes
    const functionTypeMap = Reflect.getMetadata(exports.METADATA_messageTypeMap, Message);
    if (functionTypeMap != null)
        return functionTypeMap.get(getMessageTypeMapKey(messageType, functionType));
}
exports.getMessageConstructor = getMessageConstructor;
/**
 * Defines the expected response associated with a Z-Wave message
 */
function expectedResponse(type) {
    return (messageClass) => {
        logger_1.log("protocol", `${messageClass.name}: defining expected response ${strings_1.num2hex(type)}`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_expectedResponse, type, messageClass);
    };
}
exports.expectedResponse = expectedResponse;
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
function getExpectedResponse(messageClass) {
    // get the class constructor
    const constr = messageClass.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_expectedResponse, constr);
    logger_1.log("protocol", `${constr.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getExpectedResponse = getExpectedResponse;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getExpectedResponseStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_expectedResponse, classConstructor);
    logger_1.log("protocol", `${classConstructor.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    return ret;
}
exports.getExpectedResponseStatic = getExpectedResponseStatic;
