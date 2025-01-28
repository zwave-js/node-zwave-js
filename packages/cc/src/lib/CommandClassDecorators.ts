import {
	createReflectionDecorator,
	createReflectionDecoratorPair,
	createValuelessReflectionDecorator,
} from "@zwave-js/core/reflection";
import {
	type CommandClasses,
	ZWaveError,
	ZWaveErrorCodes,
} from "@zwave-js/core/safe";
import type { TypedClassDecorator } from "@zwave-js/shared";
import type { APIConstructor, CCAPI } from "./API.js";
import {
	type CCConstructor,
	type CCResponsePredicate,
	type CommandClass,
	type DynamicCCResponse,
} from "./CommandClass.js";
import type {
	DynamicCCValue,
	StaticCCValue,
	StaticCCValueFactory,
} from "./Values.js";

const CCAndCommandDecorator = createReflectionDecoratorPair<
	typeof CommandClass,
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
	typeof CCAPI,
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
	const ret = CCAndCommandDecorator.lookupSuperValueStatic(
		constr as typeof CommandClass,
	)
		?? apiDecorator.lookupValueStatic(constr as typeof CCAPI);

	if (ret == undefined) {
		throw new ZWaveError(
			`No command class defined for ${constr.name}!`,
			ZWaveErrorCodes.CC_Invalid,
		);
	}
	return ret;
}

const implementedVersionDecorator = createReflectionDecorator<
	typeof CommandClass,
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
	typeof CommandClass,
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
	TTarget extends typeof CommandClass,
	TSent extends CommandClass,
	TReceived extends CommandClass,
>(
	cc: CCConstructor<TReceived> | DynamicCCResponse<TSent, TReceived>,
	predicate?: CCResponsePredicate<TSent, TReceived>,
): TypedClassDecorator<TTarget> {
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

const ccValuesDecorator = createReflectionDecorator<
	typeof CommandClass,
	[valueDefinition: Record<string, StaticCCValue | DynamicCCValue>],
	Record<string, StaticCCValue | DynamicCCValue | undefined>
>({
	name: "ccValues",
	valueFromArgs: (valueDefinition) => valueDefinition,
	// We don't need reverse lookup
	constructorLookupKey: false,
});

/**
 * @publicAPI
 * Defines which CC value definitions belong to a Z-Wave command class
 */
export const ccValues = ccValuesDecorator.decorator;

/**
 * @publicAPI
 * Retrieves the CC value definitions which belong to a Z-Wave command class
 */
export function getCCValues<T extends CommandClass>(
	cc: T | CommandClasses,
): Record<string, StaticCCValue | DynamicCCValue | undefined> | undefined {
	// get the class constructor
	let constr: CCConstructor<CommandClass> | undefined;
	if (typeof cc === "number") {
		constr = getCCConstructor(cc);
	} else {
		constr = cc.constructor as CCConstructor<CommandClass>;
	}

	if (constr) return ccValuesDecorator.lookupValueStatic(constr);
}

const ccValue_METADATA = Symbol.for(`METADATA_ccValue`);

// /**
//  * @publicAPI
//  * Defines which CC value a Z-Wave command class property belongs to
//  */
// export function ccValue<TTarget extends CommandClass>(
// 	value: StaticCCValue,
// ): TypedPropertyDecorator<TTarget>;

// export function ccValue<TTarget extends CommandClass, TArgs extends any[]>(
// 	value: DynamicCCValue<TArgs>,
// 	getArgs: (self: TTarget) => Readonly<TArgs>,
// ): TypedPropertyDecorator<TTarget>;

// // Ideally this should use the PropertyReflectionDecorator, but we cannot reuse the
// // target type in the getArgs function then.
// export function ccValue<TTarget extends CommandClass, TArgs extends any[]>(
// 	...args:
// 		| [value: StaticCCValue]
// 		| [value: DynamicCCValue<TArgs>, getArgs: (self: TTarget) => TArgs]
// ): TypedPropertyDecorator<TTarget> {
// 	// Normalize the arguments to the expected format
// 	debugger;
// 	let valueOrFactory: StaticCCValue | StaticCCValueFactory<TTarget>;
// 	if (args.length === 1) {
// 		valueOrFactory = args[0];
// 	} else {
// 		const [value, getArgs] = args;
// 		valueOrFactory = (self: TTarget) => {
// 			const args = getArgs(self);
// 			const base = value(...args);
// 			return {
// 				...base,
// 				is: value.is,
// 				options: value.options,
// 			};
// 		};
// 	}

// 	return function decoratorBody_ccValue(
// 		target: TTarget,
// 		property: string | number | symbol,
// 	): void {
// 		// get the class constructor
// 		const constr = target.constructor;

// 		// retrieve the current metadata
// 		const metadata: Map<
// 			string | number,
// 			StaticCCValue | StaticCCValueFactory<TTarget>
// 		> = Reflect.getMetadata(ccValue_METADATA, constr) ?? new Map();

// 		// Add the variable
// 		metadata.set(property as string | number, valueOrFactory);

// 		// And store it back
// 		Reflect.defineMetadata(ccValue_METADATA, metadata, constr);
// 	};
// }

export function ccValueProperty<
	Class extends abstract new (...args: any) => any,
>(
	property: keyof InstanceType<Class>,
	value: StaticCCValue,
): TypedClassDecorator<Class>;

export function ccValueProperty<
	Class extends abstract new (...args: any) => any,
	const TArgs extends any[],
>(
	property: keyof InstanceType<Class>,
	value: DynamicCCValue<TArgs>,
	getArgs: (self: InstanceType<Class>) => TArgs,
): TypedClassDecorator<Class>;

/**
 * @publicAPI
 * Defines which CC values the properties of a Z-Wave Command Class correspond to
 */
export function ccValueProperty<
	Class extends abstract new (...args: any) => any,
	const TArgs extends any[],
>(
	property: keyof InstanceType<Class>,
	...args:
		| [value: StaticCCValue]
		| [
			value: DynamicCCValue<TArgs>,
			getArgs: (self: InstanceType<Class>) => TArgs,
		]
): TypedClassDecorator<Class> {
	return function decorator_ccValueProperty(constr: Class): void {
		// retrieve the current metadata
		const metadata: Map<
			string | number,
			StaticCCValue | StaticCCValueFactory<InstanceType<Class>>
		> = Reflect.getMetadata(ccValue_METADATA, constr) ?? new Map();

		// Determine the correct metadata
		let valueOrFactory:
			| StaticCCValue
			| StaticCCValueFactory<InstanceType<Class>>;
		if (args.length === 1) {
			valueOrFactory = args[0];
		} else {
			const [value, getArgs] = args;
			valueOrFactory = (self: InstanceType<Class>) => {
				const args = getArgs(self);
				const base = value(...args);
				return {
					...base,
					is: value.is,
					options: value.options,
				};
			};
		}

		// Add the metadata
		metadata.set(property as string | number, valueOrFactory);

		// And store it back
		Reflect.defineMetadata(ccValue_METADATA, metadata, constr);
	};
}

/**
 * @publicAPI
 * Retrieves the defined mapping between properties and CC values of a Z-Wave command class instance
 */
export function getCCValueProperties<TTarget extends CommandClass>(
	target: TTarget,
): ReadonlyMap<string | number, StaticCCValue | StaticCCValueFactory<TTarget>> {
	return (
		Reflect.getMetadata(ccValue_METADATA, target.constructor) ?? new Map()
	);
}

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

const supervisionDecorator = createValuelessReflectionDecorator<
	typeof CommandClass
>({
	name: "useSupervision",
});

/**
 * @publicAPI
 * Defines that this CC may be sent supervised
 */
export const useSupervision = supervisionDecorator.decorator;

/**
 * @publicAPI
 * Checks if the given CC may be sent supervised
 */
export const shouldUseSupervision = supervisionDecorator.isDecorated;
