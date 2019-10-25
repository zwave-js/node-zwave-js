import { isArray } from "alcalzone-shared/typeguards";
import { IDriver } from "../driver/IDriver";
import { CommandClass, CommandClassOptions } from "./CommandClass";

/** Defines the static side of an encapsulating command class */
export interface EncapsulatingCommandClassStatic {
	new (
		driver: IDriver,
		options: CommandClassOptions,
	): EncapsulatingCommandClass;

	encapsulate(driver: IDriver, cc: CommandClass): EncapsulatingCommandClass;
	unwrap(cc: EncapsulatingCommandClass): CommandClass;
}

export interface EncapsulatingCommandClass {
	constructor: EncapsulatingCommandClassStatic;
	encapsulated: CommandClass;
}

/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
export function isEncapsulatingCommandClass(
	cc: any,
): cc is CommandClass & EncapsulatingCommandClass {
	// To satisfy the criterion, cc must be a CommandClass
	if (!(cc instanceof CommandClass)) return false;
	// The encapsulated property must be a CommandClass
	if (!((cc as any).encapsulated instanceof CommandClass)) {
		return false;
	}

	// Walk up the static side of the prototype chain to see if it has the required methods
	let proto: any = Object.getPrototypeOf(cc.constructor);
	while (proto) {
		if (
			typeof proto.encapsulate === "function" &&
			typeof proto.unwrap === "function"
		) {
			return true;
		}
		proto = Object.getPrototypeOf(proto);
	}
	return false;
}

/** Defines the static side of an encapsulating command class */
export interface MultiEncapsulatingCommandClassStatic {
	new (
		driver: IDriver,
		options: CommandClassOptions,
	): MultiEncapsulatingCommandClass;

	requiresEncapsulation(cc: CommandClass): boolean;
	encapsulate(
		driver: IDriver,
		CCs: CommandClass[],
	): MultiEncapsulatingCommandClass;
	unwrap(cc: MultiEncapsulatingCommandClass): CommandClass[];
}

export interface MultiEncapsulatingCommandClass {
	constructor: MultiEncapsulatingCommandClassStatic;
	encapsulated: CommandClass[];
}

/**
 * Tests if a given CC statically implements the EncapsulatingCommandClassStatic interface
 * @param cc The command class instance to test
 */
export function isMultiEncapsulatingCommandClass(
	cc: any,
): cc is CommandClass & MultiEncapsulatingCommandClass {
	// To satisfy the criterion, cc must be a CommandClass
	if (!(cc instanceof CommandClass)) return false;
	// The encapsulated property must  array of CCs
	if (
		!(
			isArray((cc as any).encapsulated) &&
			(cc as any).encapsulated.every(
				(item: any) => item instanceof CommandClass,
			)
		)
	) {
		return false;
	}

	// Walk up the static side of the prototype chain to see if it has the required methods
	let proto: any = Object.getPrototypeOf(cc.constructor);
	while (proto) {
		if (
			typeof proto.encapsulate === "function" &&
			typeof proto.unwrap === "function"
		) {
			return true;
		}
		proto = Object.getPrototypeOf(proto);
	}
	return false;
}
