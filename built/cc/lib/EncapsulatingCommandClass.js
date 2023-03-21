"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isMultiEncapsulatingCommandClass = exports.isEncapsulatingCommandClass = void 0;
const typeguards_1 = require("alcalzone-shared/typeguards");
const CommandClass_1 = require("./CommandClass");
/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
function isEncapsulatingCommandClass(cc) {
    // To satisfy the criterion, cc must be a CommandClass
    if (!(cc instanceof CommandClass_1.CommandClass))
        return false;
    // The encapsulated property must be a CommandClass
    if (!(cc.encapsulated instanceof CommandClass_1.CommandClass)) {
        return false;
    }
    // Walk up the static side of the prototype chain to see if it has the required methods
    let proto = Object.getPrototypeOf(cc.constructor);
    while (proto) {
        if (typeof proto.encapsulate === "function") {
            return true;
        }
        proto = Object.getPrototypeOf(proto);
    }
    return false;
}
exports.isEncapsulatingCommandClass = isEncapsulatingCommandClass;
/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
function isMultiEncapsulatingCommandClass(cc) {
    // To satisfy the criterion, cc must be a CommandClass
    if (!(cc instanceof CommandClass_1.CommandClass))
        return false;
    // The encapsulated property must  array of CCs
    if (!((0, typeguards_1.isArray)(cc.encapsulated) &&
        cc.encapsulated.every((item) => item instanceof CommandClass_1.CommandClass))) {
        return false;
    }
    // Walk up the static side of the prototype chain to see if it has the required methods
    let proto = Object.getPrototypeOf(cc.constructor);
    while (proto) {
        if (typeof proto.encapsulate === "function") {
            return true;
        }
        proto = Object.getPrototypeOf(proto);
    }
    return false;
}
exports.isMultiEncapsulatingCommandClass = isMultiEncapsulatingCommandClass;
//# sourceMappingURL=EncapsulatingCommandClass.js.map