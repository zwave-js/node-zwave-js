"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNVMFileIDStatic = exports.getNVMFileConstructor = exports.getNVMFileID = exports.nvmFileID = exports.NVMFile = exports.gotDeserializationOptions = void 0;
const safe_1 = require("@zwave-js/core/safe");
const consts_1 = require("../nvm3/consts");
function gotDeserializationOptions(options) {
    return "object" in options;
}
exports.gotDeserializationOptions = gotDeserializationOptions;
class NVMFile {
    constructor(options) {
        this.fileId = 0;
        this.fileVersion = options.fileVersion;
        if (gotDeserializationOptions(options)) {
            this.fileId = options.object.key;
            this.object = options.object;
        }
        else {
            const fileId = getNVMFileID(this);
            if (typeof fileId === "number") {
                this.fileId = fileId;
            }
            this.object = {
                key: this.fileId,
                fragmentType: consts_1.FragmentType.None,
                type: consts_1.ObjectType.DataLarge,
            };
        }
        this.payload = this.object.data ?? Buffer.allocUnsafe(0);
    }
    /**
     * Creates an instance of the CC that is serialized in the given buffer
     */
    static from(object, fileVersion) {
        // Fall back to unspecified command class in case we receive one that is not implemented
        const Constructor = getNVMFileConstructor(object.key);
        return new Constructor({
            fileId: object.key,
            fileVersion,
            object,
        });
    }
    /**
     * Serializes this NVMFile into an NVM Object
     */
    serialize() {
        if (!this.fileId) {
            throw new Error("The NVM file ID must be set before serializing");
        }
        this.object.key = this.fileId;
        this.object.data = this.payload;
        // We only support large and small data objects for now
        if (this.payload.length <= consts_1.NVM3_MAX_OBJ_SIZE_SMALL) {
            this.object.type = consts_1.ObjectType.DataSmall;
        }
        else {
            this.object.type = consts_1.ObjectType.DataLarge;
        }
        // By default output unfragmented objects, they will be split later
        this.object.fragmentType = consts_1.FragmentType.None;
        return this.object;
    }
    toJSON() {
        return {
            "file ID": `0x${this.fileId.toString(16)} (${this.constructor.name})`,
        };
    }
}
exports.NVMFile = NVMFile;
const METADATA_nvmFileID = Symbol("nvmFileID");
const METADATA_nvmFileIDMap = Symbol("nvmFileIDMap");
/**
 * Defines the ID associated with a NVM file class
 */
function nvmFileID(id) {
    return (messageClass) => {
        Reflect.defineMetadata(METADATA_nvmFileID, id, messageClass);
        // also store a map in the NVMFile metadata for lookup.
        const map = Reflect.getMetadata(METADATA_nvmFileIDMap, NVMFile) || new Map();
        map.set(id, messageClass);
        Reflect.defineMetadata(METADATA_nvmFileIDMap, map, NVMFile);
    };
}
exports.nvmFileID = nvmFileID;
/**
 * Retrieves the file ID defined for a NVM file class
 */
function getNVMFileID(id) {
    // get the class constructor
    const constr = id.constructor;
    // retrieve the current metadata
    const ret = id instanceof NVMFile
        ? Reflect.getMetadata(METADATA_nvmFileID, constr)
        : undefined;
    if (ret == undefined) {
        throw new safe_1.ZWaveError(`No NVM file ID defined for ${constr.name}!`, safe_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getNVMFileID = getNVMFileID;
/**
 * Looks up the NVM file constructor for a given file ID
 */
function getNVMFileConstructor(id) {
    // Retrieve the constructor map from the NVMFile class
    const map = Reflect.getMetadata(METADATA_nvmFileIDMap, NVMFile);
    if (map != undefined) {
        if (map.has(id))
            return map.get(id);
        // Otherwise loop through predicates
        for (const [key, value] of map.entries()) {
            if (typeof key === "function" && key(id))
                return value;
        }
    }
}
exports.getNVMFileConstructor = getNVMFileConstructor;
/**
 * Retrieves the file ID defined for a NVM file class
 */
function getNVMFileIDStatic(classConstructor) {
    // retrieve the current metadata
    const ret = Reflect.getMetadata(METADATA_nvmFileID, classConstructor);
    if (ret == undefined) {
        throw new safe_1.ZWaveError(`No NVM file ID defined for ${classConstructor.name}!`, safe_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getNVMFileIDStatic = getNVMFileIDStatic;
//# sourceMappingURL=NVMFile.js.map