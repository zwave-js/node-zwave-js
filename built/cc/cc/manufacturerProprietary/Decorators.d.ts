import type { APIConstructor, CCAPI } from "../../lib/API";
import type { ManufacturerProprietaryCC, ManufacturerProprietaryCCAPI, ManufacturerProprietaryCCConstructor } from "../ManufacturerProprietaryCC";
import type { FibaroCC } from "./FibaroCC";
/**
 * @publicAPI
 * Defines the Manufacturer ID associated with a specific implementation of the Manufacturer Proprietary CC
 */
export declare const manufacturerId: <TTarget extends ManufacturerProprietaryCC>(manufacturerId: number) => import("@zwave-js/shared").TypedClassDecorator<TTarget>;
/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
export declare const getManufacturerId: (target: ManufacturerProprietaryCC) => number | undefined;
/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
export declare function getManufacturerIdStatic<T extends ManufacturerProprietaryCCConstructor>(classConstructor: T): number;
/**
 * @publicAPI
 * Looks up the Manufacturer Proprietary CC constructor for a given Manufacturer ID
 */
export declare const getManufacturerProprietaryCCConstructor: (manufacturerId: number) => ManufacturerProprietaryCCConstructor | undefined;
/**
 * @publicAPI
 * Defines the manufacturer ID a Proprietary CC API implementation belongs to
 */
export declare const manufacturerProprietaryAPI: <TTarget extends CCAPI>(manufacturerId: number) => import("@zwave-js/shared").TypedClassDecorator<TTarget>;
/**
 * @publicAPI
 * Retrieves the Proprietary CC API constructor for a given Manufacturer ID
 */
export declare const getManufacturerProprietaryAPI: (manufacturerId: number) => APIConstructor<ManufacturerProprietaryCCAPI> | undefined;
/**
 * @publicAPI
 * Defines the Fibaro CC ID a subclass of a Fibaro CC implements
 */
export declare const fibaroCC: <TTarget extends FibaroCC>(fibaroCCId: number) => import("@zwave-js/shared").TypedClassDecorator<TTarget>;
/**
 * @publicAPI
 * Retrieves the Fibaro CC ID a subclass of a Fibaro CC implements
 */
export declare const getFibaroCCId: (target: FibaroCC) => number | undefined;
/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID
 */
export declare const getFibaroCCConstructor: (fibaroCCId: number) => ManufacturerProprietaryCCConstructor<typeof FibaroCC> | undefined;
/**
 * @publicAPI
 * Defines the Fibaro CC command a subclass of the Fibaro CC implements
 */
export declare const fibaroCCCommand: <TTarget extends FibaroCC>(fibaroCCCommand: number) => import("@zwave-js/shared").TypedClassDecorator<TTarget>;
/**
 * @publicAPI
 * Retrieves the Fibaro CC command a subclass of a Fibaro CC implements
 */
export declare const getFibaroCCCommand: (target: FibaroCC) => number | undefined;
/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID and command
 */
export declare const getFibaroCCCommandConstructor: (fibaroCCId: number, fibaroCCCommand: number) => ManufacturerProprietaryCCConstructor<typeof FibaroCC> | undefined;
//# sourceMappingURL=Decorators.d.ts.map