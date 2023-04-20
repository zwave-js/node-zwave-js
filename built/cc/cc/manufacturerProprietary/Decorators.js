"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFibaroCCCommandConstructor = exports.getFibaroCCCommand = exports.fibaroCCCommand = exports.getFibaroCCConstructor = exports.getFibaroCCId = exports.fibaroCC = exports.getManufacturerProprietaryAPI = exports.manufacturerProprietaryAPI = exports.getManufacturerProprietaryCCConstructor = exports.getManufacturerIdStatic = exports.getManufacturerId = exports.manufacturerId = void 0;
const core_1 = require("@zwave-js/core");
// === Define the manufacturer ID for a given Manufacturer Proprietary CC subclass
const manufacturerIdDecorator = (0, core_1.createSimpleReflectionDecorator)({
    name: "manufacturerId",
});
/**
 * @publicAPI
 * Defines the Manufacturer ID associated with a specific implementation of the Manufacturer Proprietary CC
 */
exports.manufacturerId = manufacturerIdDecorator.decorator;
/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
exports.getManufacturerId = manufacturerIdDecorator.lookupValue;
/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
function getManufacturerIdStatic(classConstructor) {
    // retrieve the current metadata
    const ret = manufacturerIdDecorator.lookupValueStatic(classConstructor);
    if (ret == undefined) {
        throw new core_1.ZWaveError(`No manufacturer ID defined for ${classConstructor.name}!`, core_1.ZWaveErrorCodes.CC_Invalid);
    }
    return ret;
}
exports.getManufacturerIdStatic = getManufacturerIdStatic;
/**
 * @publicAPI
 * Looks up the Manufacturer Proprietary CC constructor for a given Manufacturer ID
 */
exports.getManufacturerProprietaryCCConstructor = manufacturerIdDecorator.lookupConstructor;
const manufacturerProprietaryAPIDecorator = (0, core_1.createSimpleReflectionDecorator)({
    name: "manufacturerProprietaryAPI",
});
/**
 * @publicAPI
 * Defines the manufacturer ID a Proprietary CC API implementation belongs to
 */
exports.manufacturerProprietaryAPI = manufacturerProprietaryAPIDecorator.decorator;
/**
 * @publicAPI
 * Retrieves the Proprietary CC API constructor for a given Manufacturer ID
 */
exports.getManufacturerProprietaryAPI = manufacturerProprietaryAPIDecorator.lookupConstructor;
// Fibaro CC specific decorators
// Decorators for easy lookup
const FibaroCCAndCommandDecorator = (0, core_1.createReflectionDecoratorPair)({ superName: "fibaroCC", subName: "fibaroCCCommand" });
/**
 * @publicAPI
 * Defines the Fibaro CC ID a subclass of a Fibaro CC implements
 */
exports.fibaroCC = FibaroCCAndCommandDecorator.superDecorator;
/**
 * @publicAPI
 * Retrieves the Fibaro CC ID a subclass of a Fibaro CC implements
 */
exports.getFibaroCCId = FibaroCCAndCommandDecorator.lookupSuperValue;
/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID
 */
exports.getFibaroCCConstructor = FibaroCCAndCommandDecorator.lookupSuperConstructor;
/**
 * @publicAPI
 * Defines the Fibaro CC command a subclass of the Fibaro CC implements
 */
exports.fibaroCCCommand = FibaroCCAndCommandDecorator.subDecorator;
/**
 * @publicAPI
 * Retrieves the Fibaro CC command a subclass of a Fibaro CC implements
 */
exports.getFibaroCCCommand = FibaroCCAndCommandDecorator.lookupSubValue;
/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID and command
 */
exports.getFibaroCCCommandConstructor = FibaroCCAndCommandDecorator.lookupSubConstructor;
//# sourceMappingURL=Decorators.js.map