"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultPriorityStatic = exports.getDefaultPriority = exports.priority = exports.getExpectedCallbackStatic = exports.getExpectedCallback = exports.expectedCallback = exports.getExpectedResponseStatic = exports.getExpectedResponse = exports.expectedResponse = exports.getFunctionTypeStatic = exports.getFunctionType = exports.getMessageTypeStatic = exports.getMessageType = exports.messageTypes = exports.Message = exports.gotDeserializationOptions = exports.MessageOrigin = void 0;
const core_1 = require("@zwave-js/core");
const safe_1 = require("@zwave-js/shared/safe");
const MessageHeaders_1 = require("../MessageHeaders");
const Constants_1 = require("./Constants");
const INodeQuery_1 = require("./INodeQuery");
/** Where a serialized message originates from, to distinguish how certain messages need to be deserialized */
var MessageOrigin;
(function (MessageOrigin) {
    MessageOrigin[MessageOrigin["Controller"] = 0] = "Controller";
    MessageOrigin[MessageOrigin["Host"] = 1] = "Host";
})(MessageOrigin = exports.MessageOrigin || (exports.MessageOrigin = {}));
/**
 * Tests whether the given message constructor options contain a buffer for deserialization
 */
function gotDeserializationOptions(options) {
    return options != undefined && Buffer.isBuffer(options.data);
}
exports.gotDeserializationOptions = gotDeserializationOptions;
/**
 * Represents a Z-Wave message for communication with the serial interface
 */
class Message {
    constructor(host, options = {}) {
        this.host = host;
        // decide which implementation we follow
        if (gotDeserializationOptions(options)) {
            // #1: deserialize from payload
            const payload = options.data;
            // SOF, length, type, commandId and checksum must be present
            if (!payload.length || payload.length < 5) {
                throw new core_1.ZWaveError("Could not deserialize the message because it was truncated", core_1.ZWaveErrorCodes.PacketFormat_Truncated);
            }
            // the packet has to start with SOF
            if (payload[0] !== MessageHeaders_1.MessageHeaders.SOF) {
                throw new core_1.ZWaveError("Could not deserialize the message because it does not start with SOF", core_1.ZWaveErrorCodes.PacketFormat_Invalid);
            }
            // check the length again, this time with the transmitted length
            const messageLength = Message.getMessageLength(payload);
            if (payload.length < messageLength) {
                throw new core_1.ZWaveError("Could not deserialize the message because it was truncated", core_1.ZWaveErrorCodes.PacketFormat_Truncated);
            }
            // check the checksum
            const expectedChecksum = computeChecksum(payload.slice(0, messageLength));
            if (payload[messageLength - 1] !== expectedChecksum) {
                throw new core_1.ZWaveError("Could not deserialize the message because the checksum didn't match", core_1.ZWaveErrorCodes.PacketFormat_Checksum);
            }
            this.type = payload[2];
            this.functionType = payload[3];
            const payloadLength = messageLength - 5;
            this.payload = payload.slice(4, 4 + payloadLength);
        }
        else {
            // Try to determine the message type
            if (options.type == undefined)
                options.type = getMessageType(this);
            if (options.type == undefined) {
                throw new core_1.ZWaveError("A message must have a given or predefined message type", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.type = options.type;
            if (options.functionType == undefined)
                options.functionType = getFunctionType(this);
            if (options.functionType == undefined) {
                throw new core_1.ZWaveError("A message must have a given or predefined function type", core_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.functionType = options.functionType;
            // Fall back to decorated response/callback types if none is given
            this.expectedResponse =
                options.expectedResponse ?? getExpectedResponse(this);
            this.expectedCallback =
                options.expectedCallback ?? getExpectedCallback(this);
            this._callbackId = options.callbackId;
            this.payload = options.payload || Buffer.allocUnsafe(0);
        }
    }
    /**
     * Used to map requests to responses.
     *
     * WARNING: Accessing this property will generate a new callback ID if this message had none.
     * If you want to compare the callback ID, use `hasCallbackId()` beforehand to check if the callback ID is already defined.
     */
    get callbackId() {
        if (this._callbackId == undefined) {
            this._callbackId = this.host.getNextCallbackId();
        }
        return this._callbackId;
    }
    set callbackId(v) {
        this._callbackId = v;
    }
    /**
     * Tests whether this message's callback ID is defined
     */
    hasCallbackId() {
        return this._callbackId != undefined;
    }
    /**
     * Tests whether this message needs a callback ID to match its response
     */
    needsCallbackId() {
        return true;
    }
    /** Returns the response timeout for this message in case the default settings do not apply. */
    getResponseTimeout() {
        // Use default timeout
        return;
    }
    /** Returns the callback timeout for this message in case the default settings do not apply. */
    getCallbackTimeout() {
        // Use default timeout
        return;
    }
    /** Serializes this message into a Buffer */
    serialize() {
        const ret = Buffer.allocUnsafe(this.payload.length + 5);
        ret[0] = MessageHeaders_1.MessageHeaders.SOF;
        // length of the following data, including the checksum
        ret[1] = this.payload.length + 3;
        // write the remaining data
        ret[2] = this.type;
        ret[3] = this.functionType;
        this.payload.copy(ret, 4);
        // followed by the checksum
        ret[ret.length - 1] = computeChecksum(ret);
        return ret;
    }
    /** Returns the number of bytes the first message in the buffer occupies */
    static getMessageLength(data) {
        const remainingLength = data[1];
        return remainingLength + 2;
    }
    /**
     * Checks if there's enough data in the buffer to deserialize
     */
    static isComplete(data) {
        if (!data || !data.length || data.length < 5)
            return false; // not yet
        const messageLength = Message.getMessageLength(data);
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
    /** Creates an instance of the message that is serialized in the given buffer */
    static from(host, options) {
        const Constructor = Message.getConstructor(options.data);
        const ret = new Constructor(host, options);
        return ret;
    }
    /** Returns the slice of data which represents the message payload */
    static extractPayload(data) {
        const messageLength = Message.getMessageLength(data);
        const payloadLength = messageLength - 5;
        return data.slice(4, 4 + payloadLength);
    }
    /** Generates a representation of this Message for the log */
    toLogEntry() {
        const tags = [
            this.type === Constants_1.MessageType.Request ? "REQ" : "RES",
            Constants_1.FunctionType[this.functionType],
        ];
        const nodeId = this.getNodeId();
        if (nodeId)
            tags.unshift((0, core_1.getNodeTag)(nodeId));
        return {
            tags,
            message: this.payload.length > 0
                ? { payload: `0x${this.payload.toString("hex")}` }
                : undefined,
        };
    }
    /** Generates the JSON representation of this Message */
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            name: this.constructor.name,
            type: Constants_1.MessageType[this.type],
            functionType: Constants_1.FunctionType[this.functionType] || (0, safe_1.num2hex)(this.functionType),
        };
        if (this.expectedResponse != null)
            ret.expectedResponse = Constants_1.FunctionType[this.functionType];
        ret.payload = this.payload.toString("hex");
        return ret;
    }
    testMessage(msg, predicate) {
        if (predicate == undefined)
            return false;
        if (typeof predicate === "number") {
            return msg.functionType === predicate;
        }
        if ((0, safe_1.staticExtends)(predicate, Message)) {
            // predicate is a Message constructor
            return msg instanceof predicate;
        }
        else {
            // predicate is a ResponsePredicate
            return predicate(this, msg);
        }
    }
    /** Tests whether this message expects a response from the controller */
    expectsResponse() {
        return !!this.expectedResponse;
    }
    /** Tests whether this message expects a callback from the controller */
    expectsCallback() {
        // A message expects a callback...
        return (
        // ...when it has a callback id that is not 0 (no callback)
        ((this.hasCallbackId() && this.callbackId !== 0) ||
            // or the message type does not need a callback id to match the response
            !this.needsCallbackId()) &&
            // and the expected callback is defined
            !!this.expectedCallback);
    }
    /** Tests whether this message expects an update from the target node to finalize the transaction */
    expectsNodeUpdate() {
        // Most messages don't expect an update by default
        return false;
    }
    /** Checks if a message is an expected response for this message */
    isExpectedResponse(msg) {
        return (msg.type === Constants_1.MessageType.Response &&
            this.testMessage(msg, this.expectedResponse));
    }
    /** Checks if a message is an expected callback for this message */
    isExpectedCallback(msg) {
        if (msg.type !== Constants_1.MessageType.Request)
            return false;
        // If a received request included a callback id, enforce that the response contains the same
        if (this.hasCallbackId() &&
            (!msg.hasCallbackId() || this._callbackId !== msg._callbackId)) {
            return false;
        }
        return this.testMessage(msg, this.expectedCallback);
    }
    /** Checks if a message is an expected node update for this message */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    isExpectedNodeUpdate(msg) {
        // Most messages don't expect an update by default
        return false;
    }
    /** Finds the ID of the target or source node in a message, if it contains that information */
    getNodeId() {
        if ((0, INodeQuery_1.isNodeQuery)(this))
            return this.nodeId;
        // Override this in subclasses if a different behavior is desired
    }
    /**
     * Returns the node this message is linked to or undefined
     */
    getNodeUnsafe(applHost) {
        const nodeId = this.getNodeId();
        if (nodeId != undefined)
            return applHost.nodes.get(nodeId);
    }
    /** The timestamp when this message was (last) transmitted (in nanoseconds) */
    get transmissionTimestamp() {
        return this._transmissionTimestamp;
    }
    /** Marks this message as sent and sets the transmission timestamp */
    markAsSent() {
        this._transmissionTimestamp = (0, core_1.highResTimestamp)();
        this._completedTimestamp = undefined;
    }
    get completedTimestamp() {
        return this._completedTimestamp;
    }
    /** Marks this message as completed and sets the corresponding timestamp */
    markAsCompleted() {
        this._completedTimestamp = (0, core_1.highResTimestamp)();
    }
    /** Returns the round trip time of this message from transmission until completion. */
    get rtt() {
        if (this._transmissionTimestamp == undefined)
            return undefined;
        if (this._completedTimestamp == undefined)
            return undefined;
        return this._completedTimestamp - this._transmissionTimestamp;
    }
}
exports.Message = Message;
/** Computes the checksum for a serialized message as defined in the Z-Wave specs */
function computeChecksum(message) {
    let ret = 0xff;
    // exclude SOF and checksum byte from the computation
    for (let i = 1; i < message.length - 1; i++) {
        ret ^= message[i];
    }
    return ret;
}
function getMessageTypeMapKey(messageType, functionType) {
    return JSON.stringify({ messageType, functionType });
}
const messageTypesDecorator = (0, core_1.createReflectionDecorator)({
    name: "messageTypes",
    valueFromArgs: (messageType, functionType) => ({
        messageType,
        functionType,
    }),
    constructorLookupKey(target, messageType, functionType) {
        return getMessageTypeMapKey(messageType, functionType);
    },
});
/**
 * Defines the message and function type associated with a Z-Wave message
 */
exports.messageTypes = messageTypesDecorator.decorator;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
function getMessageType(messageClass) {
    return messageTypesDecorator.lookupValue(messageClass)?.messageType;
}
exports.getMessageType = getMessageType;
/**
 * Retrieves the message type defined for a Z-Wave message class
 */
function getMessageTypeStatic(classConstructor) {
    return messageTypesDecorator.lookupValueStatic(classConstructor)
        ?.messageType;
}
exports.getMessageTypeStatic = getMessageTypeStatic;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getFunctionType(messageClass) {
    return messageTypesDecorator.lookupValue(messageClass)?.functionType;
}
exports.getFunctionType = getFunctionType;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getFunctionTypeStatic(classConstructor) {
    return messageTypesDecorator.lookupValueStatic(classConstructor)
        ?.functionType;
}
exports.getFunctionTypeStatic = getFunctionTypeStatic;
/**
 * Looks up the message constructor for a given message type and function type
 */
function getMessageConstructor(messageType, functionType) {
    return messageTypesDecorator.lookupConstructorByKey(getMessageTypeMapKey(messageType, functionType));
}
const expectedResponseDecorator = (0, core_1.createReflectionDecorator)({
    name: "expectedResponse",
    valueFromArgs: (typeOrPredicate) => typeOrPredicate,
    constructorLookupKey: false,
});
/**
 * Defines the expected response function type or message class for a Z-Wave message
 */
exports.expectedResponse = expectedResponseDecorator.decorator;
/**
 * Retrieves the expected response function type or message class defined for a Z-Wave message class
 */
function getExpectedResponse(messageClass) {
    return expectedResponseDecorator.lookupValue(messageClass);
}
exports.getExpectedResponse = getExpectedResponse;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getExpectedResponseStatic(classConstructor) {
    return expectedResponseDecorator.lookupValueStatic(classConstructor);
}
exports.getExpectedResponseStatic = getExpectedResponseStatic;
const expectedCallbackDecorator = (0, core_1.createReflectionDecorator)({
    name: "expectedCallback",
    valueFromArgs: (typeOrPredicate) => typeOrPredicate,
    constructorLookupKey: false,
});
/**
 * Defines the expected callback function type or message class for a Z-Wave message
 */
function expectedCallback(typeOrPredicate) {
    return expectedCallbackDecorator.decorator(typeOrPredicate);
}
exports.expectedCallback = expectedCallback;
/**
 * Retrieves the expected callback function type or message class defined for a Z-Wave message class
 */
function getExpectedCallback(messageClass) {
    return expectedCallbackDecorator.lookupValue(messageClass);
}
exports.getExpectedCallback = getExpectedCallback;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getExpectedCallbackStatic(classConstructor) {
    return expectedCallbackDecorator.lookupValueStatic(classConstructor);
}
exports.getExpectedCallbackStatic = getExpectedCallbackStatic;
const priorityDecorator = (0, core_1.createReflectionDecorator)({
    name: "priority",
    valueFromArgs: (priority) => priority,
    constructorLookupKey: false,
});
/**
 * Defines the default priority associated with a Z-Wave message
 */
exports.priority = priorityDecorator.decorator;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
function getDefaultPriority(messageClass) {
    return priorityDecorator.lookupValue(messageClass);
}
exports.getDefaultPriority = getDefaultPriority;
/**
 * Retrieves the default priority defined for a Z-Wave message class
 */
function getDefaultPriorityStatic(classConstructor) {
    return priorityDecorator.lookupValueStatic(classConstructor);
}
exports.getDefaultPriorityStatic = getDefaultPriorityStatic;
//# sourceMappingURL=Message.js.map