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
        const prevValue = this._db.get(key);
        this._db.set(key, value);
        this.emit("value updated", {
            commandClass: cc,
            endpoint,
            propertyName,
            prevValue,
            newValue: value,
        });
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
}
exports.ValueDB = ValueDB;
