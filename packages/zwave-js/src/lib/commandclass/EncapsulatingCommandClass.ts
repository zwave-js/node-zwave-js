import { isArray } from "alcalzone-shared/typeguards";
import type { Driver } from "../driver/Driver";
import { CommandClass, CommandClassOptions } from "./CommandClass";

/** Defines the static side of an encapsulating command class */
export interface EncapsulatingCommandClassStatic {
	new (
		driver: Driver,
		options: CommandClassOptions,
	): EncapsulatingCommandClass;

	encapsulate(driver: Driver, cc: CommandClass): EncapsulatingCommandClass;
}

export type EncapsulatedCommandClass = CommandClass & {
	encapsulatingCC: EncapsulatingCommandClass;
};

export type EncapsulatingCommandClass = CommandClass & {
	constructor: EncapsulatingCommandClassStatic;
	encapsulated: EncapsulatedCommandClass;
};

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
		if (typeof proto.encapsulate === "function") {
			return true;
		}
		proto = Object.getPrototypeOf(proto);
	}
	return false;
}

/** Defines the static side of an encapsulating command class */
export interface MultiEncapsulatingCommandClassStatic {
	new (
		driver: Driver,
		options: CommandClassOptions,
	): MultiEncapsulatingCommandClass;

	requiresEncapsulation(cc: CommandClass): boolean;
	encapsulate(
		driver: Driver,
		CCs: CommandClass[],
	): MultiEncapsulatingCommandClass;
}

export interface MultiEncapsulatingCommandClass {
	constructor: MultiEncapsulatingCommandClassStatic;
	encapsulated: EncapsulatedCommandClass[];
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
		if (typeof proto.encapsulate === "function") {
			return true;
		}
		proto = Object.getPrototypeOf(proto);
	}
	return false;
}
