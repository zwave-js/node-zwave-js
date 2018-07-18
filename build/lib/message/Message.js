"use strict";
/// <reference types="reflect-metadata" />
Object.defineProperty(exports, "__esModule", { value: true });
const objects_1 = require("alcalzone-shared/objects");
const ZWaveError_1 = require("../error/ZWaveError");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const Constants_1 = require("./Constants");
/**
 * Represents a ZWave message for communication with the serial interface
 */
class Message {
    // implementation
    constructor(typeOrPayload, funcType, expResponse, payload) {
        // decide which implementation we follow
        let type;
        if (typeof typeOrPayload === "number") { // #2
            type = typeOrPayload;
        }
        else if (typeOrPayload instanceof Buffer) { // #1
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
        ret[0] = Constants_1.MessageHeaders.SOF;
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
        if (data[0] !== Constants_1.MessageHeaders.SOF) {
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
    /** Returns the slice of data which represents the message payload */
    static getPayload(data) {
        // we assume the message has been tested already for completeness
        const remainingLength = data[1];
        const messageLength = remainingLength + 2;
        const payloadLength = messageLength - 5;
        return data.slice(4, 4 + payloadLength);
    }
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            name: this.constructor.name,
            type: Constants_1.MessageType[this.type],
            functionType: Constants_1.FunctionType[this.functionType] || strings_1.num2hex(this.functionType),
        };
        if (this.expectedResponse != null)
            ret.expectedResponse = Constants_1.FunctionType[this.functionType];
        if (this.payload != null)
            ret.payload = this.payload.toString("hex");
        return ret;
    }
    toJSONInherited(props) {
        const ret = this.toJSONInternal();
        delete ret.payload;
        for (const [key, value] of objects_1.entries(props)) {
            if (value !== undefined)
                ret[key] = value;
        }
        return ret;
    }
    /** Checks if a message is an expected response for this message */
    testResponse(msg) {
        const expected = this.expectedResponse;
        // log("driver", `Message: testing response`, "debug");
        if (typeof expected === "number"
            && msg.type === Constants_1.MessageType.Response) {
            // if only a functionType was configured as expected,
            // any message with this function type is expected,
            // every other message is unexpected
            // log("driver", `  received response with fT ${msg.functionType}`, "debug");
            return expected === msg.functionType ? "final" : "unexpected";
        }
        else if (typeof expected === "function") {
            // If a predicate was configured, use it to test the message
            return expected(this, msg);
        }
        // nothing was configured, this expects no response
        return "unexpected";
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
// =======================
// use decorators to link function types to message classes
// tslint:disable:variable-name
exports.METADATA_messageTypes = Symbol("messageTypes");
exports.METADATA_messageTypeMap = Symbol("messageTypeMap");
exports.METADATA_expectedResponse = Symbol("expectedResponse");
exports.METADATA_priority = Symbol("priority");
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
    // Retrieve the constructor map from the Message class
    const functionTypeMap = Reflect.getMetadata(exports.METADATA_messageTypeMap, Message);
    if (functionTypeMap != null)
        return functionTypeMap.get(getMessageTypeMapKey(messageType, functionType));
}
exports.getMessageConstructor = getMessageConstructor;
function expectedResponse(typeOrPredicate) {
    return (messageClass) => {
        if (typeof typeOrPredicate === "number") {
            const type = typeOrPredicate;
            logger_1.log("protocol", `${messageClass.name}: defining expected response ${strings_1.num2hex(type)}`, "silly");
        }
        else {
            const predicate = typeOrPredicate;
            logger_1.log("protocol", `${messageClass.name}: defining expected response [Predicate${predicate.name.length > 0 ? " " + predicate.name : ""}]`, "silly");
        }
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_expectedResponse, typeOrPredicate, messageClass);
    };
}
exports.expectedResponse = expectedResponse;
// tslint:enable:unified-signatures
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
function getExpectedResponse(messageClass) {
    // get the class constructor
    const constr = messageClass.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_expectedResponse, constr);
    if (typeof ret === "number") {
        logger_1.log("protocol", `${constr.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    }
    else if (typeof ret === "function") {
        logger_1.log("protocol", `${constr.name}: retrieving expected response => [Predicate${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
    }
    return ret;
}
exports.getExpectedResponse = getExpectedResponse;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getExpectedResponseStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_expectedResponse, classConstructor);
    if (typeof ret === "number") {
        logger_1.log("protocol", `${classConstructor.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    }
    else if (typeof ret === "function") {
        logger_1.log("protocol", `${classConstructor.name}: retrieving expected response => [Predicate${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
    }
    return ret;
}
exports.getExpectedResponseStatic = getExpectedResponseStatic;
/**
 * Defines the default priority associated with a Z-Wave message
 */
function priority(prio) {
    return (messageClass) => {
        logger_1.log("protocol", `${messageClass.name}: defining default priority ${Constants_1.MessagePriority[prio]} (${prio})`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_priority, prio, messageClass);
    };
}
exports.priority = priority;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
function getDefaultPriority(messageClass) {
    // get the class constructor
    const constr = messageClass.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_priority, constr);
    logger_1.log("protocol", `${constr.name}: retrieving default priority => ${Constants_1.MessagePriority[ret]} (${ret})`, "silly");
    return ret;
}
exports.getDefaultPriority = getDefaultPriority;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
function getDefaultPriorityStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_priority, classConstructor);
    logger_1.log("protocol", `${classConstructor.name}: retrieving default priority => ${Constants_1.MessagePriority[ret]} (${ret})`, "silly");
    return ret;
}
exports.getDefaultPriorityStatic = getDefaultPriorityStatic;
