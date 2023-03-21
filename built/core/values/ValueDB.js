"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.indexDBsByNode = exports.dbKeyToValueIdFast = exports.ValueDB = exports.valueIdToString = exports.normalizeValueID = exports.assertValueID = exports.isValueID = void 0;
const shared_1 = require("@zwave-js/shared");
const ZWaveError_1 = require("../error/ZWaveError");
function isValueID(param) {
    // commandClass is mandatory and must be numeric
    if (typeof param.commandClass !== "number")
        return false;
    // property is mandatory and must be a number or string
    if (typeof param.property !== "number" &&
        typeof param.property !== "string") {
        return false;
    }
    // propertyKey is optional and must be a number or string
    if (param.propertyKey != undefined &&
        typeof param.propertyKey !== "number" &&
        typeof param.propertyKey !== "string") {
        return false;
    }
    // endpoint is optional and must be a number
    if (param.endpoint != undefined && typeof param.endpoint !== "number") {
        return false;
    }
    return true;
}
exports.isValueID = isValueID;
function assertValueID(param) {
    if (!isValueID(param)) {
        throw new ZWaveError_1.ZWaveError(`Invalid ValueID passed!`, ZWaveError_1.ZWaveErrorCodes.Argument_Invalid);
    }
}
exports.assertValueID = assertValueID;
/**
 * Ensures all Value ID properties are in the same order and there are no extraneous properties.
 * A normalized value ID can be used as a database key */
function normalizeValueID(valueID) {
    // valueIdToString is used by all other methods of the Value DB.
    // Since those may be called by unsanitized value IDs, we need
    // to make sure we have a valid value ID at our hands
    assertValueID(valueID);
    const { commandClass, endpoint, property, propertyKey } = valueID;
    const normalized = {
        commandClass,
        endpoint: endpoint ?? 0,
        property,
    };
    if (propertyKey != undefined)
        normalized.propertyKey = propertyKey;
    return normalized;
}
exports.normalizeValueID = normalizeValueID;
function valueIdToString(valueID) {
    return JSON.stringify(normalizeValueID(valueID));
}
exports.valueIdToString = valueIdToString;
/**
 * The value store for a single node
 */
class ValueDB extends shared_1.TypedEventEmitter {
    // This is a wrapper around the driver's on-disk value and metadata key value stores
    /**
     * @param nodeId The ID of the node this Value DB belongs to
     * @param valueDB The DB instance which stores values
     * @param metadataDB The DB instance which stores metadata
     * @param ownKeys An optional pre-created index of this ValueDB's own keys
     */
    constructor(nodeId, valueDB, metadataDB, ownKeys) {
        super();
        this.nodeId = nodeId;
        this._db = valueDB;
        this._metadata = metadataDB;
        this._index = ownKeys ?? this.buildIndex();
    }
    buildIndex() {
        const ret = new Set();
        for (const key of this._db.keys()) {
            if (compareDBKeyFast(key, this.nodeId))
                ret.add(key);
        }
        for (const key of this._metadata.keys()) {
            if (!ret.has(key) && compareDBKeyFast(key, this.nodeId))
                ret.add(key);
        }
        return ret;
    }
    valueIdToDBKey(valueID) {
        return JSON.stringify({
            nodeId: this.nodeId,
            ...normalizeValueID(valueID),
        });
    }
    dbKeyToValueId(key) {
        try {
            // Try the dumb but fast way first
            return dbKeyToValueIdFast(key);
        }
        catch {
            // Fall back to JSON.parse if anything went wrong
            return JSON.parse(key);
        }
    }
    /**
     * Stores a value for a given value id
     */
    setValue(valueId, value, options = {}) {
        let dbKey;
        try {
            dbKey = this.valueIdToDBKey(valueId);
        }
        catch (e) {
            if ((0, ZWaveError_1.isZWaveError)(e) &&
                e.code === ZWaveError_1.ZWaveErrorCodes.Argument_Invalid &&
                options.noThrow === true) {
                // ignore invalid value IDs
                return;
            }
            throw e;
        }
        if (options.stateful !== false) {
            const cbArg = {
                ...valueId,
                newValue: value,
            };
            let event;
            if (this._db.has(dbKey)) {
                event = "value updated";
                cbArg.prevValue = this._db.get(dbKey);
                if (options.source)
                    cbArg.source = options.source;
            }
            else {
                event = "value added";
            }
            this._index.add(dbKey);
            this._db.set(dbKey, value, options.updateTimestamp !== false);
            if (valueId.commandClass >= 0 && options.noEvent !== true) {
                this.emit(event, cbArg);
            }
        }
        else if (valueId.commandClass >= 0) {
            // For non-stateful values just emit a notification
            this.emit("value notification", {
                ...valueId,
                value,
            });
        }
    }
    /**
     * Removes a value for a given value id
     */
    removeValue(valueId, options = {}) {
        const dbKey = this.valueIdToDBKey(valueId);
        if (!this._metadata.has(dbKey)) {
            this._index.delete(dbKey);
        }
        if (this._db.has(dbKey)) {
            const prevValue = this._db.get(dbKey);
            this._db.delete(dbKey);
            if (valueId.commandClass >= 0 && options.noEvent !== true) {
                const cbArg = {
                    ...valueId,
                    prevValue,
                };
                this.emit("value removed", cbArg);
            }
            return true;
        }
        return false;
    }
    /**
     * Retrieves a value for a given value id
     */
    getValue(valueId) {
        const key = this.valueIdToDBKey(valueId);
        return this._db.get(key);
    }
    /**
     * Checks if a value for a given value id exists in this ValueDB
     */
    hasValue(valueId) {
        const key = this.valueIdToDBKey(valueId);
        return this._db.has(key);
    }
    /** Returns all values whose id matches the given predicate */
    findValues(predicate) {
        const ret = [];
        for (const key of this._index) {
            if (!this._db.has(key))
                continue;
            const { nodeId, ...valueId } = this.dbKeyToValueId(key);
            if (predicate(valueId)) {
                ret.push({ ...valueId, value: this._db.get(key) });
            }
        }
        return ret;
    }
    /** Returns all values that are stored for a given CC */
    getValues(forCC) {
        const ret = [];
        for (const key of this._index) {
            if (compareDBKeyFast(key, this.nodeId, { commandClass: forCC }) &&
                this._db.has(key)) {
                const { nodeId, ...valueId } = this.dbKeyToValueId(key);
                const value = this._db.get(key);
                ret.push({ ...valueId, value });
            }
        }
        return ret;
    }
    /**
     * Returns when the given value id was last updated
     */
    getTimestamp(valueId) {
        const key = this.valueIdToDBKey(valueId);
        return this._db.getTimestamp(key);
    }
    /** Clears all values from the value DB */
    clear(options = {}) {
        for (const key of this._index) {
            const { nodeId, ...valueId } = this.dbKeyToValueId(key);
            if (this._db.has(key)) {
                const prevValue = this._db.get(key);
                this._db.delete(key);
                if (valueId.commandClass >= 0 && options.noEvent !== true) {
                    const cbArg = {
                        ...valueId,
                        prevValue,
                    };
                    this.emit("value removed", cbArg);
                }
            }
            if (this._metadata.has(key)) {
                this._metadata.delete(key);
                if (valueId.commandClass >= 0 && options.noEvent !== true) {
                    const cbArg = {
                        ...valueId,
                        metadata: undefined,
                    };
                    this.emit("metadata updated", cbArg);
                }
            }
        }
        this._index.clear();
    }
    /**
     * Stores metadata for a given value id
     */
    setMetadata(valueId, metadata, options = {}) {
        let dbKey;
        try {
            dbKey = this.valueIdToDBKey(valueId);
        }
        catch (e) {
            if ((0, ZWaveError_1.isZWaveError)(e) &&
                e.code === ZWaveError_1.ZWaveErrorCodes.Argument_Invalid &&
                options.noThrow === true) {
                // ignore invalid value IDs
                return;
            }
            throw e;
        }
        if (metadata) {
            this._index.add(dbKey);
            this._metadata.set(dbKey, metadata);
        }
        else {
            if (!this._db.has(dbKey)) {
                this._index.delete(dbKey);
            }
            this._metadata.delete(dbKey);
        }
        const cbArg = {
            ...valueId,
            metadata,
        };
        if (valueId.commandClass >= 0 && options.noEvent !== true) {
            this.emit("metadata updated", cbArg);
        }
    }
    /**
     * Checks if metadata for a given value id exists in this ValueDB
     */
    hasMetadata(valueId) {
        const key = this.valueIdToDBKey(valueId);
        return this._metadata.has(key);
    }
    /**
     * Retrieves metadata for a given value id
     */
    getMetadata(valueId) {
        const key = this.valueIdToDBKey(valueId);
        return this._metadata.get(key);
    }
    /** Returns all metadata that is stored for a given CC */
    getAllMetadata(forCC) {
        const ret = [];
        for (const key of this._index) {
            if (compareDBKeyFast(key, this.nodeId, { commandClass: forCC }) &&
                this._metadata.has(key)) {
                const { nodeId, ...valueId } = this.dbKeyToValueId(key);
                const metadata = this._metadata.get(key);
                ret.push({ ...valueId, metadata });
            }
        }
        return ret;
    }
    /** Returns all values whose id matches the given predicate */
    findMetadata(predicate) {
        const ret = [];
        for (const key of this._index) {
            if (!this._metadata.has(key))
                continue;
            const { nodeId, ...valueId } = this.dbKeyToValueId(key);
            if (predicate(valueId)) {
                ret.push({ ...valueId, metadata: this._metadata.get(key) });
            }
        }
        return ret;
    }
}
exports.ValueDB = ValueDB;
/**
 * Really dumb but very fast way to parse one-lined JSON strings of the following schema
 * {
 *     nodeId: number,
 *     commandClass: number,
 *     endpoint: number,
 *     property: string | number,
 *     propertyKey: string | number,
 * }
 *
 * In benchmarks this was about 58% faster than JSON.parse
 */
function dbKeyToValueIdFast(key) {
    let start = 10; // {"nodeId":
    if (key.charCodeAt(start - 1) !== 58) {
        console.error(key.slice(start - 1));
        throw new Error("Invalid input format!");
    }
    let end = start + 1;
    const len = key.length;
    while (end < len && key.charCodeAt(end) !== 44)
        end++;
    const nodeId = parseInt(key.slice(start, end));
    start = end + 16; // ,"commandClass":
    if (key.charCodeAt(start - 1) !== 58)
        throw new Error("Invalid input format!");
    end = start + 1;
    while (end < len && key.charCodeAt(end) !== 44)
        end++;
    const commandClass = parseInt(key.slice(start, end));
    start = end + 12; // ,"endpoint":
    if (key.charCodeAt(start - 1) !== 58)
        throw new Error("Invalid input format!");
    end = start + 1;
    while (end < len && key.charCodeAt(end) !== 44)
        end++;
    const endpoint = parseInt(key.slice(start, end));
    start = end + 12; // ,"property":
    if (key.charCodeAt(start - 1) !== 58)
        throw new Error("Invalid input format!");
    let property;
    if (key.charCodeAt(start) === 34) {
        start++; // skip leading "
        end = start + 1;
        while (end < len && key.charCodeAt(end) !== 34)
            end++;
        property = key.slice(start, end);
        end++; // skip trailing "
    }
    else {
        end = start + 1;
        while (end < len &&
            key.charCodeAt(end) !== 44 &&
            key.charCodeAt(end) !== 125)
            end++;
        property = parseInt(key.slice(start, end));
    }
    if (key.charCodeAt(end) !== 125) {
        let propertyKey;
        start = end + 15; // ,"propertyKey":
        if (key.charCodeAt(start - 1) !== 58)
            throw new Error("Invalid input format!");
        if (key.charCodeAt(start) === 34) {
            start++; // skip leading "
            end = start + 1;
            while (end < len && key.charCodeAt(end) !== 34)
                end++;
            propertyKey = key.slice(start, end);
            end++; // skip trailing "
        }
        else {
            end = start + 1;
            while (end < len &&
                key.charCodeAt(end) !== 44 &&
                key.charCodeAt(end) !== 125)
                end++;
            propertyKey = parseInt(key.slice(start, end));
        }
        return {
            nodeId,
            commandClass,
            endpoint,
            property,
            propertyKey,
        };
    }
    else {
        return {
            nodeId,
            commandClass,
            endpoint,
            property,
        };
    }
}
exports.dbKeyToValueIdFast = dbKeyToValueIdFast;
/** Used to filter DB entries without JSON parsing */
function compareDBKeyFast(key, nodeId, valueId) {
    if (-1 === key.indexOf(`{"nodeId":${nodeId},`))
        return false;
    if (!valueId)
        return true;
    if ("commandClass" in valueId) {
        if (-1 === key.indexOf(`,"commandClass":${valueId.commandClass},`))
            return false;
    }
    if ("endpoint" in valueId) {
        if (-1 === key.indexOf(`,"endpoint":${valueId.endpoint},`))
            return false;
    }
    if (typeof valueId.property === "string") {
        if (-1 === key.indexOf(`,"property":"${valueId.property}"`))
            return false;
    }
    else if (typeof valueId.property === "number") {
        if (-1 === key.indexOf(`,"property":${valueId.property}`))
            return false;
    }
    if (typeof valueId.propertyKey === "string") {
        if (-1 === key.indexOf(`,"propertyKey":"${valueId.propertyKey}"`))
            return false;
    }
    else if (typeof valueId.propertyKey === "number") {
        if (-1 === key.indexOf(`,"propertyKey":${valueId.propertyKey}`))
            return false;
    }
    return true;
}
/** Extracts an index for each node from one or more JSONL DBs */
function indexDBsByNode(databases) {
    const indexes = new Map();
    for (const db of databases) {
        for (const key of db.keys()) {
            const nodeId = extractNodeIdFromDBKeyFast(key);
            if (nodeId == undefined)
                continue;
            if (!indexes.has(nodeId)) {
                indexes.set(nodeId, new Set());
            }
            indexes.get(nodeId).add(key);
        }
    }
    return indexes;
}
exports.indexDBsByNode = indexDBsByNode;
function extractNodeIdFromDBKeyFast(key) {
    const start = 10; // {"nodeId":
    if (key.charCodeAt(start - 1) !== 58) {
        // Invalid input format for a node value, assume it is for the driver
        return undefined;
    }
    let end = start + 1;
    const len = key.length;
    while (end < len && key.charCodeAt(end) !== 44)
        end++;
    return parseInt(key.slice(start, end));
}
//# sourceMappingURL=ValueDB.js.map