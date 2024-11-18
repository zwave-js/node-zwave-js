/* eslint-disable @typescript-eslint/no-unused-vars */

export interface ValidateArgsOptions {
	/**
	 * Enable strict value checks for numeric enums. By default, a numeric enum will accept any number.
	 * Turning this flag on will ensure that the passed value is one of the defined enum members.
	 */
	strictEnums?: boolean;
}

/** Generates code at build time which validates all arguments of this method */
export function validateArgs<T extends (...args: any[]) => any>(
	options?: ValidateArgsOptions,
) {
	return function validateArgsBody(
		target: T,
		context: ClassMethodDecoratorContext,
	): T | void {
		// this is a no-op that gets replaced during the build process using the transformer below
		if (process.env.NODE_ENV === "test") return;
		if (process.execArgv.includes("--conditions=@@dev")) return;
		// Throw an error at runtime when this didn't get transformed
		throw new Error(
			"validateArgs is a compile-time decorator and must be compiled with a transformer",
		);
	};
}
