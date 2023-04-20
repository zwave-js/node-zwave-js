"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOSExtension = exports.MGRPExtension = exports.MPANExtension = exports.SPANExtension = exports.Security2Extension = exports.getExtensionType = exports.extensionType = exports.getS2ExtensionConstructor = void 0;
const safe_1 = require("@zwave-js/core/safe");
const safe_2 = require("@zwave-js/shared/safe");
require("reflect-metadata");
var S2ExtensionType;
(function (S2ExtensionType) {
    S2ExtensionType[S2ExtensionType["SPAN"] = 1] = "SPAN";
    S2ExtensionType[S2ExtensionType["MPAN"] = 2] = "MPAN";
    S2ExtensionType[S2ExtensionType["MGRP"] = 3] = "MGRP";
    S2ExtensionType[S2ExtensionType["MOS"] = 4] = "MOS";
})(S2ExtensionType || (S2ExtensionType = {}));
const METADATA_S2ExtensionMap = Symbol("S2ExtensionMap");
const METADATA_S2Extension = Symbol("S2Extension");
/**
 * Looks up the S2 extension constructor for a given S2 extension type
 */
function getS2ExtensionConstructor(type) {
    // Retrieve the constructor map from the CommandClass class
    const map = Reflect.getMetadata(METADATA_S2ExtensionMap, Security2Extension);
    return map?.get(type);
}
exports.getS2ExtensionConstructor = getS2ExtensionConstructor;
/**
 * Defines the command class associated with a Z-Wave message
 */
function extensionType(type) {
    return (extensionClass) => {
        Reflect.defineMetadata(METADATA_S2Extension, type, extensionClass);
        const map = Reflect.getMetadata(METADATA_S2ExtensionMap, Security2Extension) ||
            new Map();
        map.set(type, extensionClass);
        Reflect.defineMetadata(METADATA_S2ExtensionMap, map, Security2Extension);
    };
}
exports.extensionType = extensionType;
/**
 * Retrieves the command class defined for a Z-Wave message class
 */
function getExtensionType(ext) {
    // get the class constructor
    const constr = ext.constructor;
    // retrieve the current metadata
    const ret = Reflect.getMetadata(METADATA_S2Extension, constr);
    if (ret == undefined) {
        throw new safe_1.ZWaveError(`No S2 extension type defined for ${constr.name}!`, safe_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getExtensionType = getExtensionType;
function gotDeserializationOptions(options) {
    return "data" in options && Buffer.isBuffer(options.data);
}
class Security2Extension {
    constructor(options) {
        if (gotDeserializationOptions(options)) {
            (0, safe_1.validatePayload)(options.data.length >= 2);
            const totalLength = options.data[0];
            (0, safe_1.validatePayload)(options.data.length >= totalLength);
            const controlByte = options.data[1];
            this.moreToFollow = !!(controlByte & 128);
            this.critical = !!(controlByte & 64);
            this.type = controlByte & 63;
            this.payload = options.data.slice(2, totalLength);
        }
        else {
            this.type = getExtensionType(this);
            this.critical = options.critical;
            this.payload = options.payload ?? Buffer.allocUnsafe(0);
        }
    }
    isEncrypted() {
        return false;
    }
    serialize(moreToFollow) {
        return Buffer.concat([
            Buffer.from([
                2 + this.payload.length,
                (moreToFollow ? 128 : 0) |
                    (this.critical ? 64 : 0) |
                    (this.type & 63),
            ]),
            this.payload,
        ]);
    }
    /** Returns the number of bytes the first extension in the buffer occupies */
    static getExtensionLength(data) {
        return data[0];
    }
    /** Returns the number of bytes the serialized extension will occupy */
    computeLength() {
        return 2 + this.payload.length;
    }
    /**
     * Retrieves the correct constructor for the next extension in the given Buffer.
     * It is assumed that the buffer has been checked beforehand
     */
    static getConstructor(data) {
        const type = data[1] & 63;
        return getS2ExtensionConstructor(type) ?? Security2Extension;
    }
    /** Creates an instance of the S2 extension that is serialized in the given buffer */
    static from(data) {
        const Constructor = Security2Extension.getConstructor(data);
        const ret = new Constructor({ data });
        return ret;
    }
    toLogEntry() {
        let ret = `
· type: ${(0, safe_2.getEnumMemberName)(S2ExtensionType, this.type)}`;
        if (this.payload.length > 0) {
            ret += `
  payload: 0x${this.payload.toString("hex")}`;
        }
        return ret;
    }
}
exports.Security2Extension = Security2Extension;
let SPANExtension = class SPANExtension extends Security2Extension {
    constructor(options) {
        if (gotDeserializationOptions(options)) {
            super(options);
            (0, safe_1.validatePayload)(this.payload.length === 16);
            this.senderEI = this.payload;
        }
        else {
            super({ critical: true });
            if (options.senderEI.length !== 16) {
                throw new safe_1.ZWaveError("The sender's entropy must be a 16-byte buffer!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            this.senderEI = options.senderEI;
        }
    }
    serialize(moreToFollow) {
        this.payload = this.senderEI;
        return super.serialize(moreToFollow);
    }
    toLogEntry() {
        let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
        ret += `  sender EI: 0x${this.senderEI.toString("hex")}`;
        return ret;
    }
};
SPANExtension = __decorate([
    extensionType(S2ExtensionType.SPAN)
], SPANExtension);
exports.SPANExtension = SPANExtension;
let MPANExtension = class MPANExtension extends Security2Extension {
    constructor(options) {
        if (gotDeserializationOptions(options)) {
            super(options);
            (0, safe_1.validatePayload)(this.payload.length === 17);
            this.groupId = this.payload[0];
            this.innerMPANState = this.payload.slice(1);
        }
        else {
            if (options.innerMPANState.length !== 16) {
                throw new safe_1.ZWaveError("The inner MPAN state must be a 16-byte buffer!", safe_1.ZWaveErrorCodes.Argument_Invalid);
            }
            super({ critical: true });
            this.groupId = options.groupId;
            this.innerMPANState = options.innerMPANState;
        }
    }
    isEncrypted() {
        return true;
    }
    serialize(moreToFollow) {
        this.payload = Buffer.concat([
            Buffer.from([this.groupId]),
            this.innerMPANState,
        ]);
        return super.serialize(moreToFollow);
    }
    toLogEntry() {
        const mpanState = process.env.NODE_ENV === "test" ||
            process.env.NODE_ENV === "development"
            ? (0, safe_2.buffer2hex)(this.innerMPANState)
            : "(hidden)";
        let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
        ret += `  group ID: ${this.groupId}
  MPAN state: ${mpanState}`;
        return ret;
    }
};
MPANExtension = __decorate([
    extensionType(S2ExtensionType.MPAN)
], MPANExtension);
exports.MPANExtension = MPANExtension;
let MGRPExtension = class MGRPExtension extends Security2Extension {
    constructor(options) {
        if (gotDeserializationOptions(options)) {
            super(options);
            (0, safe_1.validatePayload)(this.payload.length === 1);
            this.groupId = this.payload[0];
        }
        else {
            super({ critical: true });
            this.groupId = options.groupId;
        }
    }
    serialize(moreToFollow) {
        this.payload = Buffer.from([this.groupId]);
        return super.serialize(moreToFollow);
    }
    toLogEntry() {
        let ret = super.toLogEntry().replace(/^  payload:.+$/m, "");
        ret += `  group ID: ${this.groupId}`;
        return ret;
    }
};
MGRPExtension = __decorate([
    extensionType(S2ExtensionType.MGRP)
], MGRPExtension);
exports.MGRPExtension = MGRPExtension;
let MOSExtension = class MOSExtension extends Security2Extension {
    constructor(options) {
        if (options && gotDeserializationOptions(options)) {
            super(options);
        }
        else {
            super({ critical: false });
        }
    }
};
MOSExtension = __decorate([
    extensionType(S2ExtensionType.MOS)
], MOSExtension);
exports.MOSExtension = MOSExtension;
//# sourceMappingURL=Extension.js.map