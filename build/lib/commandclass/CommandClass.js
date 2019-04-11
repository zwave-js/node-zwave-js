"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var CommandClass_1;
const objects_1 = require("alcalzone-shared/objects");
const typeguards_1 = require("alcalzone-shared/typeguards");
const fs = require("fs");
const ZWaveError_1 = require("../error/ZWaveError");
const logger_1 = require("../util/logger");
const strings_1 = require("../util/strings");
const Cache_1 = require("../values/Cache");
const Primitive_1 = require("../values/Primitive");
const CommandClasses_1 = require("./CommandClasses");
/**
 * Defines which kind of CC state should be requested
 */
var StateKind;
(function (StateKind) {
    /** Values that never change and only need to be requested once. */
    StateKind[StateKind["Static"] = 1] = "Static";
    /** Values that change sporadically. It is enough to request them on startup. */
    StateKind[StateKind["Session"] = 2] = "Session";
    /** Values that frequently change */
    StateKind[StateKind["Dynamic"] = 4] = "Dynamic";
})(StateKind = exports.StateKind || (exports.StateKind = {}));
let CommandClass = CommandClass_1 = class CommandClass {
    // implementation
    constructor(driver, nodeId, 
    // public ccId?: CommandClasses,
    ccCommand, payload = Buffer.from([])) {
        this.driver = driver;
        this.nodeId = nodeId;
        this.ccCommand = ccCommand;
        this.payload = payload;
        /** Which variables should be persisted when requested */
        this._variables = new Set();
        // Extract the cc from declared metadata if not provided
        this.ccId = getCommandClass(this);
    }
    /** Returns true if this CC is an extended CC (0xF100..0xFFFF) */
    isExtended() {
        return this.ccId >= 0xf100;
    }
    serializeWithoutHeader() {
        // NoOp CCs have no command and no payload
        if (this.ccId === CommandClasses_1.CommandClasses["No Operation"])
            return Buffer.from([this.ccId]);
        const payloadLength = this.payload != undefined ? this.payload.length : 0;
        const ccIdLength = this.isExtended() ? 2 : 1;
        const ret = Buffer.allocUnsafe(ccIdLength + 1 + payloadLength);
        ret.writeUIntBE(this.ccId, 0, ccIdLength);
        ret[ccIdLength] = this.ccCommand;
        if (payloadLength > 0 /* implies payload != undefined */) {
            this.payload.copy(ret, 1 + ccIdLength);
        }
        return ret;
    }
    deserializeWithoutHeader(data) {
        this.ccId = CommandClass_1.getCommandClassWithoutHeader(data);
        const ccIdLength = this.isExtended() ? 2 : 1;
        if (data.length > ccIdLength) {
            this.ccCommand = data[ccIdLength];
            this.payload = data.slice(ccIdLength + 1);
        }
        else {
            this.payload = Buffer.allocUnsafe(0);
        }
    }
    /**
     * Serializes this CommandClass without the nodeId + length header
     * as required for encapsulation
     */
    serializeForEncapsulation() {
        return this.serializeWithoutHeader();
    }
    serialize() {
        const data = this.serializeWithoutHeader();
        return Buffer.concat([Buffer.from([this.nodeId, data.length]), data]);
    }
    deserialize(data) {
        this.nodeId = CommandClass_1.getNodeId(data);
        const lengthWithoutHeader = data[1];
        const dataWithoutHeader = data.slice(2, 2 + lengthWithoutHeader);
        this.deserializeWithoutHeader(dataWithoutHeader);
    }
    deserializeFromEncapsulation(encapCC, data) {
        this.nodeId = encapCC.nodeId; // TODO: is this neccessarily true?
        this.deserializeWithoutHeader(data);
    }
    static getNodeId(ccData) {
        return ccData[0];
    }
    static getCommandClassWithoutHeader(data) {
        const isExtended = data[0] >= 0xf1;
        if (isExtended)
            return data.readUInt16BE(0);
        else
            return data[0];
    }
    static getCommandClass(ccData) {
        return this.getCommandClassWithoutHeader(ccData.slice(2));
    }
    /**
     * Retrieves the correct constructor for the CommandClass in the given Buffer.
     * It is assumed that the buffer only contains the serialized CC.
     */
    static getConstructor(ccData) {
        const cc = CommandClass_1.getCommandClass(ccData);
        return getCCConstructor(cc) /* || CommandClass */;
    }
    static from(driver, serializedCC) {
        // tslint:disable-next-line:variable-name
        const Constructor = CommandClass_1.getConstructor(serializedCC);
        const ret = new Constructor(driver);
        ret.deserialize(serializedCC);
        return ret;
    }
    static fromEncapsulated(driver, encapCC, serializedCC) {
        // tslint:disable-next-line:variable-name
        const Constructor = CommandClass_1.getConstructor(serializedCC);
        const ret = new Constructor(driver);
        ret.deserializeFromEncapsulation(encapCC, serializedCC);
        return ret;
    }
    toJSON() {
        return this.toJSONInternal();
    }
    toJSONInternal() {
        const ret = {
            nodeId: this.nodeId,
            ccId: CommandClasses_1.CommandClasses[this.ccId] || strings_1.num2hex(this.ccId),
        };
        if (this.payload != null && this.payload.length > 0)
            ret.payload = "0x" + this.payload.toString("hex");
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
    /** Requests static or dynamic state for a given from a node */
    /* eslint-disable @typescript-eslint/no-unused-vars */
    static async requestState(driver, node, kind) {
        // This needs to be overwritten per command class. In the default implementation, don't do anything
    }
    /* eslint-enable @typescript-eslint/no-unused-vars */
    /**
     * Determine whether the linked node supports a specific command of this command class.
     * "unknown" means that the information has not been received yet
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    supportsCommand(command) {
        // This needs to be overwritten per command class. In the default implementation, we don't know anything!
        return Primitive_1.unknownBoolean;
    }
    /**
     * Returns the node this CC is linked to. Throws if the node does not exist.
     */
    getNode() {
        if (this.nodeId == undefined)
            throw new ZWaveError_1.ZWaveError("Cannot retrieve the node without a Node ID", ZWaveError_1.ZWaveErrorCodes.CC_NoNodeID);
        return this.driver.controller.nodes.get(this.nodeId);
    }
    /** Returns the value DB for this CC's node */
    getValueDB() {
        return this.getNode().valueDB;
    }
    /** Creates a variable that will be stored */
    createVariable(name) {
        this._variables.add(name);
    }
    createVariables(...names) {
        for (const name of names) {
            this.createVariable(name);
        }
    }
    /** Persists all values on the given node */
    persistValues(variables = this._variables.keys()) {
        const db = this.getValueDB();
        for (const variable of variables) {
            db.setValue(getCommandClass(this), this.endpoint, variable, this[variable]);
        }
    }
    /** Serializes all values to be stored in the cache */
    serializeValuesForCache() {
        const ccValues = this.getValueDB().getValues(getCommandClass(this));
        return ccValues.map((_a) => {
            var { value } = _a, props = __rest(_a, ["value"]);
            return (Object.assign({}, props, { value: Cache_1.serializeCacheValue(value) }));
        });
    }
    /** Deserializes values from the cache */
    deserializeValuesFromCache(values) {
        const cc = getCommandClass(this);
        for (const val of values) {
            // Don't deserialize non-CC values
            if (!(val.propertyName in this))
                continue;
            let valueToSet = val.value;
            if (this[val.propertyName] instanceof Map &&
                typeguards_1.isObject(val.value)) {
                // convert the object back to a Map
                valueToSet = new Map(objects_1.entries(val.value));
            }
            this.getValueDB().setValue(cc, val.endpoint, val.propertyName, valueToSet);
        }
    }
};
CommandClass = CommandClass_1 = __decorate([
    implementedVersion(Number.POSITIVE_INFINITY) // per default don't impose any restrictions on the version
    ,
    __metadata("design:paramtypes", [Object, Number, Number, Buffer])
], CommandClass);
exports.CommandClass = CommandClass;
// =======================
// use decorators to link command class values to actual command classes
/* eslint-disable @typescript-eslint/camelcase */
exports.METADATA_commandClass = Symbol("commandClass");
exports.METADATA_commandClassMap = Symbol("commandClassMap");
exports.METADATA_ccResponse = Symbol("ccResponse");
exports.METADATA_version = Symbol("version");
/**
 * Defines the command class associated with a Z-Wave message
 */
function commandClass(cc) {
    return messageClass => {
        logger_1.log("protocol", `${messageClass.name}: defining command class ${CommandClasses_1.CommandClasses[cc]} (${cc})`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_commandClass, cc, messageClass);
        // also store a map in the Message metadata for lookup.
        const map = Reflect.getMetadata(exports.METADATA_commandClassMap, CommandClass) ||
            new Map();
        map.set(cc, messageClass);
        Reflect.defineMetadata(exports.METADATA_commandClassMap, map, CommandClass);
    };
}
exports.commandClass = commandClass;
/**
 * Retrieves the command class defined for a Z-Wave message class
 */
function getCommandClass(cc) {
    // get the class constructor
    const constr = cc.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_commandClass, constr);
    logger_1.log("protocol", `${constr.name}: retrieving command class => ${CommandClasses_1.CommandClasses[ret]} (${ret})`, "silly");
    return ret;
}
exports.getCommandClass = getCommandClass;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getCommandClassStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_commandClass, classConstructor);
    logger_1.log("protocol", `${classConstructor.name}: retrieving command class => ${CommandClasses_1.CommandClasses[ret]} (${ret})`, "silly");
    return ret;
}
exports.getCommandClassStatic = getCommandClassStatic;
/**
 * Looks up the command class constructor for a given command class type and function type
 */
function getCCConstructor(cc) {
    // Retrieve the constructor map from the CommandClass class
    const map = Reflect.getMetadata(exports.METADATA_commandClassMap, CommandClass);
    if (map != null)
        return map.get(cc);
}
exports.getCCConstructor = getCCConstructor;
/**
 * Defines the implemented version of a Z-Wave command class
 */
function implementedVersion(version) {
    return ccClass => {
        logger_1.log("protocol", `${ccClass.name}: defining implemented version ${version}`, "silly");
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_version, version, ccClass);
    };
}
exports.implementedVersion = implementedVersion;
/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
function getImplementedVersion(cc) {
    // get the class constructor
    let constr;
    let constrName;
    if (typeof cc === "number") {
        constr = getCCConstructor(cc);
        constrName = constr != null ? constr.name : CommandClasses_1.CommandClasses[cc];
    }
    else {
        constr = cc.constructor;
        constrName = constr.name;
    }
    // retrieve the current metadata
    let ret;
    if (constr != null)
        ret = Reflect.getMetadata(exports.METADATA_version, constr);
    if (ret == null)
        ret = 0;
    logger_1.log("protocol", `${constrName}: retrieving implemented version => ${ret}`, "silly");
    return ret;
}
exports.getImplementedVersion = getImplementedVersion;
/**
 * Retrieves the implemented version defined for a Z-Wave command class
 */
function getImplementedVersionStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_version, classConstructor) || 0;
    logger_1.log("protocol", `${classConstructor.name}: retrieving implemented version => ${ret}`, "silly");
    return ret;
}
exports.getImplementedVersionStatic = getImplementedVersionStatic;
function expectedCCResponse(ccOrDynamic) {
    return ccClass => {
        if (typeof ccOrDynamic === "number") {
            logger_1.log("protocol", `${ccClass.name}: defining expected CC response ${strings_1.num2hex(ccOrDynamic)}`, "silly");
        }
        else {
            const dynamic = ccOrDynamic;
            logger_1.log("protocol", `${ccClass.name}: defining expected CC response [dynamic${dynamic.name.length > 0 ? " " + dynamic.name : ""}]`, "silly");
        }
        // and store the metadata
        Reflect.defineMetadata(exports.METADATA_ccResponse, ccOrDynamic, ccClass);
    };
}
exports.expectedCCResponse = expectedCCResponse;
// tslint:enable:unified-signatures
/**
 * Retrieves the expected response defined for a Z-Wave message class
 */
function getExpectedCCResponse(ccClass) {
    // get the class constructor
    const constr = ccClass.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_ccResponse, constr);
    if (typeof ret === "number") {
        logger_1.log("protocol", `${constr.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    }
    else if (typeof ret === "function") {
        logger_1.log("protocol", `${constr.name}: retrieving expected response => [dynamic${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
    }
    return ret;
}
exports.getExpectedCCResponse = getExpectedCCResponse;
/**
 * Retrieves the function type defined for a Z-Wave message class
 */
function getExpectedCCResponseStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(exports.METADATA_ccResponse, classConstructor);
    if (typeof ret === "number") {
        logger_1.log("protocol", `${classConstructor.name}: retrieving expected response => ${strings_1.num2hex(ret)}`, "silly");
    }
    else if (typeof ret === "function") {
        logger_1.log("protocol", `${classConstructor.name}: retrieving expected response => [dynamic${ret.name.length > 0 ? " " + ret.name : ""}]`, "silly");
    }
    return ret;
}
exports.getExpectedCCResponseStatic = getExpectedCCResponseStatic;
/** Marks the decorated property as a value of the Command Class. This allows saving it on the node with persistValues() */
function ccValue() {
    // The internal (private) variable used by the property
    let value;
    return (target, property) => {
        // Overwrite the original property definition
        const update = Reflect.defineProperty(target, property, {
            configurable: true,
            enumerable: true,
            get() {
                return value;
            },
            set(newValue) {
                // All variables that are stored should be marked to be persisted
                target.createVariable.bind(this)(property);
                value = newValue;
            },
        });
        if (!update) {
            throw new Error(`Cannot define ${property} on ${target.constructor.name} as CC value`);
        }
    };
}
exports.ccValue = ccValue;
// To be sure all metadata gets loaded, import all command classes
const definedCCs = fs
    .readdirSync(__dirname)
    .filter(file => /CC\.js$/.test(file));
logger_1.log("protocol", `loading CCs: ${strings_1.stringify(definedCCs)}`, "silly");
for (const file of definedCCs) {
    // tslint:disable-next-line:no-var-requires
    require(`./${file}`);
}
