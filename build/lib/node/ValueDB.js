"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
function getValueKey(cc, endpoint, propertyName) {
    return JSON.stringify({
        cc,
        endpoint,
        propertyName,
    });
}
class ValueDB extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this._db = new Map();
    }
    /**
     * Stores a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     * @param value The value to set
     */
    setValue(cc, endpoint, propertyName, value) {
        const key = getValueKey(cc, endpoint, propertyName);
        const cbArg = {
            commandClass: cc,
            endpoint,
            propertyName,
            newValue: value,
        };
        let event;
        if (this._db.has(key)) {
            event = "value updated";
            cbArg.prevValue = this._db.get(key);
        }
        else {
            event = "value added";
        }
        this._db.set(key, value);
        this.emit(event, cbArg);
    }
    /**
     * Removes a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     */
    removeValue(cc, endpoint, propertyName) {
        const key = getValueKey(cc, endpoint, propertyName);
        if (this._db.has(key)) {
            const prevValue = this._db.get(key);
            this._db.delete(key);
            this.emit("value removed", {
                commandClass: cc,
                endpoint,
                propertyName,
                prevValue,
            });
            return true;
        }
        return false;
    }
    /**
     * Retrieves a value for a given property of a given CommandClass
     * @param cc The command class the value belongs to
     * @param endpoint The optional endpoint the value belongs to
     * @param propertyName The property name the value belongs to
     */
    getValue(cc, endpoint, propertyName) {
        const key = getValueKey(cc, endpoint, propertyName);
        return this._db.get(key);
    }
    getValues(forCC) {
        const ret = [];
        this._db.forEach((value, key) => {
            const { cc, endpoint, propertyName } = JSON.parse(key);
            if (forCC === cc)
                ret.push({ endpoint, propertyName, value });
        });
        return ret;
    }
    /** Clears all values from the value DB */
    clear() {
        this._db.forEach((_val, key) => {
            const { cc, endpoint, propertyName } = JSON.parse(key);
            this.removeValue(cc, endpoint, propertyName);
        });
    }
}
exports.ValueDB = ValueDB;
