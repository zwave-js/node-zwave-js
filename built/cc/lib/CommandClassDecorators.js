"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldUseSupervision = exports.useSupervision = exports.getCCValueProperties = exports.ccValue = exports.getCCValues = exports.ccValues = exports.getCCResponsePredicate = exports.getExpectedCCResponse = exports.expectedCCResponse = exports.getImplementedVersionStatic = exports.getImplementedVersion = exports.implementedVersion = exports.getCommandClass = exports.getAPI = exports.API = exports.getCommandClassStatic = exports.getCCCommandConstructor = exports.getCCCommand = exports.CCCommand = exports.getCCConstructor = exports.commandClass = void 0;
const core_1 = require("@zwave-js/core");
const CCAndCommandDecorator = (0, core_1.createReflectionDecoratorPair)({ superName: "ccId", subName: "ccCommand" });
/**
 * @publicAPI
 * Defines the CC ID associated with a Z-Wave Command Class
 */
exports.commandClass = CCAndCommandDecorator.superDecorator;
/**
 * @publicAPI
 * Looks up the command class constructor for a given CC ID
 */
exports.getCCConstructor = CCAndCommandDecorator.lookupSuperConstructor;
/**
 * @publicAPI
 * Defines the CC command a subclass of a CC implements
 */
exports.CCCommand = CCAndCommandDecorator.subDecorator;
/**
 * @publicAPI
 * Retrieves the CC command a subclass of a CC implements
 */
exports.getCCCommand = CCAndCommandDecorator.lookupSubValue;
/**
 * @publicAPI
 * Looks up the command class constructor for a given CC ID and command
 */
exports.getCCCommandConstructor = CCAndCommandDecorator.lookupSubConstructor;
/**
 * @publicAPI
 * Retrieves the CC ID defined for a Z-Wave Command Class
 */
function getCommandClassStatic(classConstructor) {
    // retrieve the current metadata
    const ret = CCAndCommandDecorator.lookupSuperValueStatic(classConstructor);
    if (ret == undefined) {
        throw new core_1.ZWaveError(`No command class defined for ${classConstructor.name}!`, core_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getCommandClassStatic = getCommandClassStatic;
const apiDecorator = (0, core_1.createReflectionDecorator)({
    name: "API",
    valueFromArgs: (cc) => cc,
});
/**
 * @publicAPI
 * Defines the CC ID a CC API implementation belongs to
 */
exports.API = apiDecorator.decorator;
/**
 * @publicAPI
 * Retrieves the CC API constructor that is defined for a Z-Wave CC ID
 */
function getAPI(cc) {
    return apiDecorator.lookupConstructorByValue(cc);
}
exports.getAPI = getAPI;
/**
 * @publicAPI
 * Retrieves the CC ID associated with a Z-Wave Command Class or CC API
 */
function getCommandClass(cc) {
    // get the class constructor
    const constr = cc.constructor;
    // retrieve the current metadata
    const ret = CCAndCommandDecorator.lookupSuperValueStatic(constr) ??
        apiDecorator.lookupValueStatic(constr);
    if (ret == undefined) {
        throw new core_1.ZWaveError(`No command class defined for ${constr.name}!`, core_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getCommandClass = getCommandClass;
const implementedVersionDecorator = (0, core_1.createReflectionDecorator)({
    name: "implementedVersion",
    valueFromArgs: (version) => version,
    constructorLookupKey: false,
});
/**
 * @publicAPI
 * Defines the implemented version of a Z-Wave command class
 */
exports.implementedVersion = implementedVersionDecorator.decorator;
/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
function getImplementedVersion(cc) {
    // get the class constructor
    let constr;
    if (typeof cc === "number") {
        constr = (0, exports.getCCConstructor)(cc);
    }
    else {
        constr = cc.constructor;
    }
    if (!constr)
        return 0;
    return implementedVersionDecorator.lookupValueStatic(constr) ?? 0;
}
exports.getImplementedVersion = getImplementedVersion;
/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
function getImplementedVersionStatic(classConstructor) {
    return implementedVersionDecorator.lookupValueStatic(classConstructor) ?? 0;
}
exports.getImplementedVersionStatic = getImplementedVersionStatic;
const expectedCCResponseDecorator = (0, core_1.createReflectionDecorator)({
    name: "expectedCCResponse",
    valueFromArgs: (cc, predicate) => ({ cc, predicate }),
    // We don't need reverse lookup
    constructorLookupKey: false,
});
/**
 * @publicAPI
 * Defines the expected response associated with a Z-Wave message
 */
function expectedCCResponse(cc, predicate) {
    return expectedCCResponseDecorator.decorator(cc, predicate);
}
exports.expectedCCResponse = expectedCCResponse;
/**
 * @publicAPI
 * Retrieves the expected response (static or dynamic) defined for a Z-Wave message class
 */
function getExpectedCCResponse(ccClass) {
    return expectedCCResponseDecorator.lookupValue(ccClass)?.cc;
}
exports.getExpectedCCResponse = getExpectedCCResponse;
/**
 * @publicAPI
 * Retrieves the CC response predicate defined for a Z-Wave message class
 */
function getCCResponsePredicate(ccClass) {
    return expectedCCResponseDecorator.lookupValue(ccClass)?.predicate;
}
exports.getCCResponsePredicate = getCCResponsePredicate;
const ccValuesDecorator = (0, core_1.createReflectionDecorator)({
    name: "ccValues",
    valueFromArgs: (valueDefinition) => valueDefinition,
    // We don't need reverse lookup
    constructorLookupKey: false,
});
/**
 * @publicAPI
 * Defines which CC value definitions belong to a Z-Wave command class
 */
exports.ccValues = ccValuesDecorator.decorator;
/**
 * @publicAPI
 * Retrieves the CC value definitions which belong to a Z-Wave command class
 */
function getCCValues(cc) {
    // get the class constructor
    let constr;
    if (typeof cc === "number") {
        constr = (0, exports.getCCConstructor)(cc);
    }
    else {
        constr = cc.constructor;
    }
    if (constr)
        return ccValuesDecorator.lookupValueStatic(constr);
}
exports.getCCValues = getCCValues;
const ccValue_METADATA = Symbol.for(`METADATA_ccValue`);
// Ideally this should use the PropertyReflectionDecorator, but we cannot reuse the
// target type in the getArgs function then.
function ccValue(...args) {
    // Normalize the arguments to the expected format
    let valueOrFactory;
    if (args.length === 1) {
        valueOrFactory = args[0];
    }
    else {
        const [value, getArgs] = args;
        valueOrFactory = (self) => {
            const args = getArgs(self);
            const base = value(...args);
            return {
                ...base,
                is: value.is,
                options: value.options,
            };
        };
    }
    return function decoratorBody_ccValue(target, property) {
        // get the class constructor
        const constr = target.constructor;
        // retrieve the current metadata
        const metadata = Reflect.getMetadata(ccValue_METADATA, constr) ?? new Map();
        // Add the variable
        metadata.set(property, valueOrFactory);
        // And store it back
        Reflect.defineMetadata(ccValue_METADATA, metadata, constr);
    };
}
exports.ccValue = ccValue;
/**
 * @publicAPI
 * Retrieves the defined mapping between properties and CC values of a Z-Wave command class instance
 */
function getCCValueProperties(target) {
    return (Reflect.getMetadata(ccValue_METADATA, target.constructor) ?? new Map());
}
exports.getCCValueProperties = getCCValueProperties;
// const ccValueDecorator = createPropertyReflectionDecorator<
// 	CommandClass,
// 	[value: StaticCCValue | StaticCCValueFactory<CommandClass>],
// 	StaticCCValue | StaticCCValueFactory<CommandClass>
// >({
// 	name: "ccValue",
// 	valueFromArgs: (valueDefinition) => valueDefinition,
// });
// /**
//  * @publicAPI
//  * Defines which CC value a Z-Wave command class property belongs to
//  */
// export const ccValue = ccValueDecorator.decorator;
// /**
//  * @publicAPI
//  * Retrieves the defined mapping between properties and CC values of a Z-Wave command class instance
//  */
// export const getCCValueDefinitions = ccValueDecorator.lookupValues;
const supervisionDecorator = (0, core_1.createValuelessReflectionDecorator)({
    name: "useSupervision",
});
/**
 * @publicAPI
 * Defines that this CC may be sent supervised
 */
exports.useSupervision = supervisionDecorator.decorator;
/**
 * @publicAPI
 * Checks if the given CC may be sent supervised
 */
exports.shouldUseSupervision = supervisionDecorator.isDecorated;
//# sourceMappingURL=CommandClassDecorators.js.map