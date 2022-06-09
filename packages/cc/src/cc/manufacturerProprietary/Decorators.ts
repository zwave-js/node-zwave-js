import {
	createReflectionDecorator,
	createReflectionDecoratorPair,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core";
import type { APIConstructor, CCAPI } from "../../lib/API";
import type {
	ManufacturerProprietaryCC,
	ManufacturerProprietaryCCAPI,
	ManufacturerProprietaryCCConstructor,
} from "../ManufacturerProprietaryCC";
import type { FibaroCC } from "./FibaroCC";

// === Define the manufacturer ID for a given Manufacturer Proprietary CC subclass

const manufacturerIdDecorator = createReflectionDecorator<
	ManufacturerProprietaryCC,
	[manufacturerId: number],
	number,
	ManufacturerProprietaryCCConstructor
>({
	name: "manufacturerId",
	valueFromArgs: (manufacturerId) => manufacturerId,
});

/**
 * @publicAPI
 * Defines the Manufacturer ID associated with a specific implementation of the Manufacturer Proprietary CC
 */
export const manufacturerId = manufacturerIdDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
export const getManufacturerId = manufacturerIdDecorator.lookupValue;

/**
 * @publicAPI
 * Retrieves the Manufacturer ID defined for a specific implementation of the Manufacturer Proprietary CC
 */
export function getManufacturerIdStatic<
	T extends ManufacturerProprietaryCCConstructor,
>(classConstructor: T): number {
	// retrieve the current metadata
	const ret = manufacturerIdDecorator.lookupValueStatic(classConstructor);
	if (ret == undefined) {
		throw new ZWaveError(
			`No manufacturer ID defined for ${classConstructor.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

/**
 * @publicAPI
 * Looks up the Manufacturer Proprietary CC constructor for a given Manufacturer ID
 */
export function getManufacturerProprietaryCCConstructor(
	manufacturerId: number,
): ManufacturerProprietaryCCConstructor | undefined {
	return manufacturerIdDecorator.lookupConstructorByValue(manufacturerId);
}

const manufacturerProprietaryAPIDecorator = createReflectionDecorator<
	CCAPI,
	[manufacturerId: number],
	number,
	APIConstructor<ManufacturerProprietaryCCAPI>
>({
	name: "manufacturerProprietaryAPI",
	valueFromArgs: (cc) => cc,
});

/**
 * @publicAPI
 * Defines the manufacturer ID a Proprietary CC API implementation belongs to
 */
export const manufacturerProprietaryAPI =
	manufacturerProprietaryAPIDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the Proprietary CC API constructor for a given Manufacturer ID
 */
export function getManufacturerProprietaryAPI(
	manufacturerId: number,
): APIConstructor<ManufacturerProprietaryCCAPI> | undefined {
	return manufacturerProprietaryAPIDecorator.lookupConstructorByValue(
		manufacturerId,
	);
}

// Fibaro CC specific decorators

// Decorators for easy lookup

const FibaroCCAndCommandDecorator = createReflectionDecoratorPair<
	FibaroCC,
	[fibaroCCId: number],
	[fibaroCCCommand: number],
	ManufacturerProprietaryCCConstructor<typeof FibaroCC>
>({ superName: "fibaroCC", subName: "fibaroCCCommand" });

/**
 * @publicAPI
 * Defines the Fibaro CC ID a subclass of a Fibaro CC implements
 */
export const fibaroCC = FibaroCCAndCommandDecorator.superDecorator;

/**
 * @publicAPI
 * Retrieves the Fibaro CC ID a subclass of a Fibaro CC implements
 */
export const getFibaroCCId = FibaroCCAndCommandDecorator.lookupSuperValue;

/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID
 */
export const getFibaroCCConstructor =
	FibaroCCAndCommandDecorator.lookupSuperConstructor;

/**
 * @publicAPI
 * Defines the Fibaro CC command a subclass of the Fibaro CC implements
 */

export const fibaroCCCommand = FibaroCCAndCommandDecorator.subDecorator;

/**
 * @publicAPI
 * Retrieves the Fibaro CC command a subclass of a Fibaro CC implements
 */
export const getFibaroCCCommand = FibaroCCAndCommandDecorator.lookupSubValue;

/**
 * @publicAPI
 * Looks up the Fibaro CC constructor for a given Fibaro CC ID and command
 */
export const getFibaroCCCommandConstructor =
	FibaroCCAndCommandDecorator.lookupSubConstructor;
