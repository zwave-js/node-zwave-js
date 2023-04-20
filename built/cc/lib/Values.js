"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.V = exports.defaultCCValueOptions = void 0;
const core_1 = require("@zwave-js/core");
exports.defaultCCValueOptions = {
    internal: false,
    minVersion: 1,
    secret: false,
    stateful: true,
    supportsEndpoints: true,
    autoCreate: true,
};
function evalOrStatic(fnOrConst, ...args) {
    return typeof fnOrConst === "function" ? fnOrConst(...args) : fnOrConst;
}
/** Defines a single static CC values that belong to a CC */
function defineStaticCCValue(commandClass, blueprint) {
    // Normalize value options
    const _blueprint = {
        ...blueprint,
        options: {
            ...exports.defaultCCValueOptions,
            ...blueprint.options,
        },
    };
    const valueId = {
        commandClass,
        property: _blueprint.property,
        propertyKey: _blueprint.propertyKey,
    };
    if (valueId.propertyKey === undefined)
        delete valueId.propertyKey;
    const ret = {
        get id() {
            return { ...valueId };
        },
        endpoint: (endpoint = 0) => {
            if (!_blueprint.options.supportsEndpoints)
                endpoint = 0;
            return { ...valueId, endpoint };
        },
        is: (testValueId) => {
            return (valueId.commandClass === testValueId.commandClass &&
                valueId.property === testValueId.property &&
                valueId.propertyKey === testValueId.propertyKey);
        },
        get meta() {
            return { ...core_1.ValueMetadata.Any, ..._blueprint.meta };
        },
        get options() {
            return { ..._blueprint.options };
        },
    };
    return ret;
}
/** Defines a single CC value which depends on one or more parameters */
function defineDynamicCCValue(commandClass, blueprint) {
    const options = {
        ...exports.defaultCCValueOptions,
        ...blueprint.options,
    };
    const ret = ((...args) => {
        const _blueprint = blueprint(...args);
        // Normalize value options
        const actualBlueprint = {
            ..._blueprint,
        };
        const valueId = {
            commandClass,
            property: actualBlueprint.property,
            propertyKey: actualBlueprint.propertyKey,
        };
        if (valueId.propertyKey === undefined)
            delete valueId.propertyKey;
        const value = {
            get id() {
                return { ...valueId };
            },
            endpoint: (endpoint = 0) => {
                if (!options.supportsEndpoints)
                    endpoint = 0;
                return { ...valueId, endpoint };
            },
            get meta() {
                return { ...core_1.ValueMetadata.Any, ...actualBlueprint.meta };
            },
        };
        return value;
    });
    Object.defineProperty(ret, "options", {
        configurable: false,
        enumerable: true,
        get() {
            return { ...options };
        },
    });
    Object.defineProperty(ret, "is", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: (id) => id.commandClass === commandClass && blueprint.is(id),
    });
    return ret;
}
// Namespace for utilities to define CC values
exports.V = {
    /** Defines multiple static CC values that belong to the same CC */
    defineStaticCCValues(commandClass, values) {
        return Object.fromEntries(Object.entries(values).map(([key, blueprint]) => [
            key,
            defineStaticCCValue(commandClass, blueprint),
        ]));
    },
    /** Defines multiple static CC values that belong to the same CC */
    defineDynamicCCValues(commandClass, values) {
        return Object.fromEntries(Object.entries(values).map(([key, blueprint]) => [
            key,
            defineDynamicCCValue(commandClass, blueprint),
        ]));
    },
    /** Returns a CC value definition that is named like the value `property` */
    staticProperty(property, meta, options) {
        return {
            [property]: {
                property,
                meta,
                options,
            },
        };
    },
    /** Returns a CC value definition with the given name and `property` */
    staticPropertyWithName(name, property, meta, options) {
        return {
            [name]: {
                property,
                meta,
                options,
            },
        };
    },
    /** Returns a CC value definition with the given name, `property` and `propertyKey` */
    staticPropertyAndKeyWithName(name, property, propertyKey, meta, options) {
        return {
            [name]: {
                property,
                propertyKey,
                meta,
                options,
            },
        };
    },
    /** Returns a CC value definition with the given name and a dynamic `property` */
    dynamicPropertyWithName(name, property, is, meta, options) {
        return {
            [name]: Object.assign((...args) => ({
                property: evalOrStatic(property, ...args),
                meta: evalOrStatic(meta, ...args),
            }), { is, options }),
        };
    },
    /** Returns a CC value definition with the given name and a dynamic `property` */
    dynamicPropertyAndKeyWithName(name, property, propertyKey, is, meta, options) {
        return {
            [name]: Object.assign((...args) => {
                return {
                    property: evalOrStatic(property, ...args),
                    propertyKey: evalOrStatic(propertyKey, ...args),
                    meta: evalOrStatic(meta, ...args),
                };
            }, { is, options }),
        };
    },
};
//# sourceMappingURL=Values.js.map