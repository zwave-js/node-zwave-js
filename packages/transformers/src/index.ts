/* eslint-disable @typescript-eslint/no-unused-vars */

// function checkGetErrorObject(
// 	getErrorObject: unknown,
// ): asserts getErrorObject is (obj: any) => any {
// 	if (typeof getErrorObject !== "function") {
// 		throw new Error(
// 			"This module should not be used in runtime. Instead, use a transformer during compilation.",
// 		);
// 	}
// }

// /**
//  * Checks if the given argument is assignable to the given type-argument.
//  *
//  * @param object object whose type needs to be checked.
//  * @returns `true` if `object` is assignable to `T`, false otherwise.
//  * @example
//    ```
//    is<number>(42); // -> true
//    is<number>('foo'); // -> false
//    ```
//  */
// export function is<T>(object: any): object is T;
// export function is<T>(obj: any, getErrorObject?: (obj: any) => any): obj is T {
// 	checkGetErrorObject(getErrorObject);
// 	const errorObject = getErrorObject(obj);
// 	return errorObject === null;
// }

// /**
//  * Creates a function similar to `is<T>` that can be invoked at a later point.
//  *
//  * This is useful, for example, if you want to re-use the function multiple times.
//  *
//  * @example
//    ```
//    const checkNumber = createIs<number>();
//    checkNumber(42); // -> true
//    checkNumber('foo'); // -> false
//    ```
//  */
// export function createIs<T>(): (object: any) => object is T;
// export function createIs<T>(
// 	getErrorObject = undefined,
// ): (object: any) => object is T {
// 	checkGetErrorObject(getErrorObject);
// 	// @ts-expect-error We're using an internal signature
// 	return (obj) => is(obj, getErrorObject);
// }

export interface ValidateArgsOptions {
	/**
	 * Enable strict value checks for numeric enums. By default, a numeric enum will accept any number.
	 * Turning this flag on will ensure that the passed value is one of the defined enum members.
	 */
	strictEnums?: boolean;
}

/** Generates code at build time which validates all arguments of this method */
export function validateArgs(options?: ValidateArgsOptions): PropertyDecorator {
	return (target: unknown, property: string | number | symbol) => {
		// this is a no-op that gets replaced during the build process using the transformer below
		if (process.env.NODE_ENV === "test") return;
		if (process.execArgv.includes("--conditions=@@dev")) return;
		// Throw an error at runtime when this didn't get transformed
		throw new Error(
			"validateArgs is a compile-time decorator and must be compiled with a transformer",
		);
	};
}

import transformer from "./validateArgs/transformer";
export default transformer;
