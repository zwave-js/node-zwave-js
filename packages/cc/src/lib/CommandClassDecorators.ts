import {
	createReflectionDecorator,
	createReflectionDecoratorPair,
	ZWaveError,
	ZWaveErrorCodes,
	type CommandClasses,
} from "@zwave-js/core";
import type { TypedClassDecorator } from "@zwave-js/shared";
import type { APIConstructor, CCAPI } from "./API";
import type {
	CCConstructor,
	CCResponsePredicate,
	CommandClass,
	DynamicCCResponse,
} from "./CommandClass";
import type { DynamicOrStaticCCValue } from "./Values";

const CCAndCommandDecorator = createReflectionDecoratorPair<
	CommandClass,
	[ccId: CommandClasses],
	[ccCommand: number],
	CCConstructor<CommandClass>
>({ superName: "ccId", subName: "ccCommand" });

/**
 * @publicAPI
 * Defines the CC ID associated with a Z-Wave Command Class
 */
export const commandClass = CCAndCommandDecorator.superDecorator;

/**
 * @publicAPI
 * Looks up the command class constructor for a given CC ID
 */
export const getCCConstructor = CCAndCommandDecorator.lookupSuperConstructor;

/**
 * @publicAPI
 * Defines the CC command a subclass of a CC implements
 */
export const CCCommand = CCAndCommandDecorator.subDecorator;

/**
 * @publicAPI
 * Retrieves the CC command a subclass of a CC implements
 */
export const getCCCommand = CCAndCommandDecorator.lookupSubValue;

/**
 * @publicAPI
 * Looks up the command class constructor for a given CC ID and command
 */
export const getCCCommandConstructor =
	CCAndCommandDecorator.lookupSubConstructor;

/**
 * @publicAPI
 * Retrieves the CC ID defined for a Z-Wave Command Class
 */
export function getCommandClassStatic<T extends CCConstructor<CommandClass>>(
	classConstructor: T,
): CommandClasses {
	// retrieve the current metadata
	const ret = CCAndCommandDecorator.lookupSuperValueStatic(classConstructor);
	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${classConstructor.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

const apiDecorator = createReflectionDecorator<
	CCAPI,
	[cc: CommandClasses],
	CommandClasses,
	APIConstructor
>({
	name: "API",
	valueFromArgs: (cc) => cc,
});

/**
 * @publicAPI
 * Defines the CC ID a CC API implementation belongs to
 */
export const API = apiDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the CC API constructor that is defined for a Z-Wave CC ID
 */
export function getAPI(cc: CommandClasses): APIConstructor | undefined {
	return apiDecorator.lookupConstructorByValue(cc);
}

/**
 * @publicAPI
 * Retrieves the CC ID associated with a Z-Wave Command Class or CC API
 */
export function getCommandClass(cc: CommandClass | CCAPI): CommandClasses {
	// get the class constructor
	const constr = cc.constructor;
	// retrieve the current metadata
	const ret =
		CCAndCommandDecorator.lookupSuperValueStatic(constr) ??
		apiDecorator.lookupValueStatic(constr);

	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

const implementedVersionDecorator = createReflectionDecorator<
	CommandClass,
	[version: number],
	number
>({
	name: "implementedVersion",
	valueFromArgs: (version) => version,
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Defines the implemented version of a Z-Wave command class
 */
export const implementedVersion = implementedVersionDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersion<T extends CommandClass>(
	cc: T | CommandClasses,
): number {
	// get the class constructor
	let constr: CCConstructor<CommandClass> | undefined;
	if (typeof cc === "number") {
		constr = getCCConstructor(cc);
	} else {
		constr = cc.constructor as CCConstructor<CommandClass>;
	}

	if (!constr) return 0;
	return implementedVersionDecorator.lookupValueStatic(constr) ?? 0;
}

/**
 * @publicAPI
 * Retrieves the implemented version defined for a Z-Wave command class
 */
export function getImplementedVersionStatic<
	T extends CCConstructor<CommandClass>,
>(classConstructor: T): number {
	return implementedVersionDecorator.lookupValueStatic(classConstructor) ?? 0;
}

const expectedCCResponseDecorator = createReflectionDecorator<
	CommandClass,
	[
		cc:
			| CCConstructor<CommandClass>
			| DynamicCCResponse<CommandClass, CommandClass>,
		predicate?: CCResponsePredicate<CommandClass, CommandClass>,
	],
	{
		cc:
			| CCConstructor<CommandClass>
			| DynamicCCResponse<CommandClass, CommandClass>;
		predicate?: CCResponsePredicate<CommandClass, CommandClass>;
	}
>({
	name: "expectedCCResponse",
	valueFromArgs: (cc, predicate) => ({ cc, predicate }),
	// We don't need reverse lookup
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Defines the expected response associated with a Z-Wave message
 */
export function expectedCCResponse<
	TSent extends CommandClass,
	TReceived extends CommandClass,
>(
	cc: CCConstructor<TReceived> | DynamicCCResponse<TSent, TReceived>,
	predicate?: CCResponsePredicate<TSent, TReceived>,
): TypedClassDecorator<CommandClass> {
	return expectedCCResponseDecorator.decorator(cc as any, predicate as any);
}

/**
 * @publicAPI
 * Retrieves the expected response (static or dynamic) defined for a Z-Wave message class
 */
export function getExpectedCCResponse<T extends CommandClass>(
	ccClass: T,
): typeof CommandClass | DynamicCCResponse<T> | undefined {
	return expectedCCResponseDecorator.lookupValue(ccClass)?.cc;
}

/**
 * @publicAPI
 * Retrieves the CC response predicate defined for a Z-Wave message class
 */
export function getCCResponsePredicate<T extends CommandClass>(
	ccClass: T,
): CCResponsePredicate<T> | undefined {
	return expectedCCResponseDecorator.lookupValue(ccClass)?.predicate;
}

const CCValuesDecorator = createReflectionDecorator<
	CommandClass,
	// It doesn't seem possible to find a type all of the generic CC value definitions are assignable to
	// So unknown is an escape hatch here
	// [valueDefinition: unknown],
	[valueDefinition: Record<string, DynamicOrStaticCCValue>],
	Record<string, DynamicOrStaticCCValue | undefined>
>({
	name: "CCValues",
	valueFromArgs: (valueDefinition) => valueDefinition as any,
	// We don't need reverse lookup
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Defines which CC value definitions belong to a Z-Wave command class
 */
export const CCValues = CCValuesDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the CC value definitions which belong to a Z-Wave command class
 */
export function getCCValues<
	T extends Record<string, DynamicOrStaticCCValue | undefined>,
>(cc: CommandClass): T | undefined {
	return CCValuesDecorator.lookupValue(cc) as T;
}
