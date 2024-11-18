import { isUint8Array } from "@zwave-js/shared";
import { assertNever } from "alcalzone-shared/helpers";
import { ZWaveError, ZWaveErrorCodes } from "../index_browser.js";

const primivitiveTypes = new Set([
	"string",
	"number",
	"boolean",
	"null",
	"undefined",
]);

function addIndexToName(
	e: ErrorElaboration,
	index?: number,
): ErrorElaboration {
	if (index != undefined) {
		return {
			...e,
			name: `${e.name}[${index}]`,
		};
	}
	return e;
}

function getTypeName(e: ErrorElaboration): string {
	switch (e.type) {
		case "primitive":
			return e.expected;
		case "union":
			if (e.typeName) return e.typeName;
			return e.nested.map(getTypeName).join(" | ");
		case "intersection":
			if (e.typeName) return e.typeName;
			return e.nested.map(getTypeName).join(" & ");
		case "enum":
			return e.enum;
		case "date":
			return "Date";
		case "array":
			return `Array<${e.itemType}>`;
		case "tuple":
			return e.tupleType;
		case "object":
			return e.objectType;
		case "uint8array":
			return "Uint8Array";
		case "class":
			return e.class;
	}
	throw new Error(
		`Cannot determine type name for error ${JSON.stringify(e)}`,
	);
}

function formatElaboration(e: ErrorElaboration, indent: number = 0): string {
	let ret: string = " ".repeat(indent * 2);
	const optional = e.optional ? "optional " : "";
	let what = `${optional}${e.kind} ${e.name}`;
	if (e.index != undefined) what += `[${e.index}]`;

	// TODO: Show actual value if it's a primitive type

	if (e.type === "primitive") {
		if (e.expected === "null" || e.expected === "undefined") {
			ret += `Expected ${what} to be ${e.expected}, got ${e.actual}`;
		} else {
			ret += `Expected ${what} to be a ${e.expected}, got ${e.actual}`;
		}
	} else if (e.type === "literal") {
		ret += `Expected ${what} to be ${e.expected}, got ${e.actual}`;
	} else if (e.type === "union") {
		const allPrimitive = e.nested.every((n) => n.type === "primitive");
		if (allPrimitive || primivitiveTypes.has(e.actualType)) {
			ret += `Expected ${what} to be one of ${
				e.nested.map(getTypeName).join(" | ")
			}, got ${e.actual}`;
		} else {
			if (e.typeName) {
				ret +=
					`${what} is not assignable to ${e.typeName}. Expected one of the following constraints to pass:`;
			} else {
				ret += `Expected ${what} to be one of ${getTypeName(e)}`;
			}
			for (const nested of e.nested) {
				if (nested.type === "primitive") continue;
				ret += "\n"
					+ formatElaboration(
						addIndexToName(nested, e.index),
						indent + 1,
					);
			}
		}
	} else if (e.type === "intersection") {
		if (e.nested.length > 1) {
			ret += `${what} is violating multiple constraints`;
			for (const nested of e.nested) {
				ret += "\n"
					+ formatElaboration(
						addIndexToName(nested, e.index),
						indent + 1,
					);
			}
		} else {
			ret = ret.slice(0, -2)
				+ formatElaboration(
					addIndexToName(e.nested[0], e.index),
					indent,
				);
		}
	} else if (e.type === "enum") {
		ret +=
			`Expected ${what} to be a member of enum ${e.enum}, got ${e.actual}`;
	} else if (e.type === "date") {
		ret += `Expected ${what} to be a Date, got ${e.actual}`;
	} else if (e.type === "array") {
		if (e.nested) {
			ret += `${what} is not assignable to Array<${e.itemType}>`;
			for (const nested of e.nested) {
				ret += "\n"
					+ formatElaboration(
						addIndexToName(nested, e.index),
						indent + 1,
					);
			}
		} else {
			ret +=
				`Expected ${what} to be an Array<${e.itemType}>, got ${e.actual}`;
		}
	} else if (e.type === "tuple") {
		if (e.nested) {
			ret += `${what} is not assignable to ${e.tupleType}`;
			for (const nested of e.nested) {
				ret += "\n"
					+ formatElaboration(
						addIndexToName(nested, e.index),
						indent + 1,
					);
			}
		} else {
			ret +=
				`Expected ${what} to be of type ${e.tupleType}, got ${e.actual}`;
		}
	} else if (e.type === "object") {
		if (e.nested) {
			ret += `${what} is not assignable to ${e.objectType}`;
			for (const nested of e.nested) {
				if ("actual" in nested && nested.actual === "undefined") {
					ret += `\n${
						" ".repeat((indent + 1) * 2)
					}required property ${nested.name} is missing`;
				} else {
					ret += "\n"
						+ formatElaboration(
							addIndexToName(nested, e.index),
							indent + 1,
						);
				}
			}
		} else {
			ret +=
				`Expected ${what} to be of type ${e.objectType}, got ${e.actual}`;
		}
	} else if (e.type === "uint8array") {
		ret += `Expected ${what} to be a Uint8Array, got ${e.actual}`;
	} else if (e.type === "missing") {
		ret += `ERROR: Missing validation for ${what}`;
	} else if (e.type === "class") {
		ret +=
			`Expected ${what} to be an instance of class ${e.class}, got ${e.actual}`;
	} else {
		assertNever(e);
	}

	return ret;
}

function formatActualType(value: any): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";
	const type = typeof value;
	switch (type) {
		case "string":
		case "number":
		case "boolean":
		case "function":
			return type;
	}

	if (Array.isArray(value)) return `array`;
	return "object";
}

function formatActualValue(value: any): string {
	if (value === null) return "null";
	if (value === undefined) return "undefined";

	switch (typeof value) {
		case "string":
			return `string "${value}"`;
		case "number":
		case "boolean":
			return value.toString();

		case "function":
			return `function ${value.name || "<anonymous>"}`;
	}

	if (Array.isArray(value)) {
		return `array [ ...${value.length} item${
			value.length !== 1 ? "s" : ""
		} ]`;
	}

	// 	// TODO: Elaborate on objects a bit, detect classes/functions

	if (typeof value === "object") return "object";
	return String(value);
}

export interface ValidatorContext {
	kind: "parameter" | "item" | "object" | "property";
	name: string;
}

export type ValidatorFunction = (value: any) => ValidatorResult;

type ErrorElaboration =
	& ValidatorContext
	& {
		optional?: boolean;
		// Only for array item elaborations
		index?: number;
	}
	& ({
		type: "primitive";
		expected: "string" | "number" | "boolean" | "null" | "undefined";
		actual: string;
	} | {
		type: "literal";
		expected: string;
		actual: string;
	} | {
		type: "date";
		actual: string;
	} | {
		type: "uint8array";
		actual: string;
	} | {
		type: "union";
		typeName: string | undefined;
		actual: string;
		actualType: string;
		nested: ErrorElaboration[];
	} | {
		type: "intersection";
		typeName: string | undefined;
		actual: string;
		nested: ErrorElaboration[];
	} | {
		type: "array";
		itemType: string;
		actual: string;
		// Only defined if the value is an array
		nested?: ErrorElaboration[];
	} | {
		type: "tuple";
		tupleType: string;
		actual: string;
		// Only defined if the value is an array
		nested?: ErrorElaboration[];
	} | {
		type: "object";
		objectType: string;
		actual: string;
		// Only defined if the value is an object
		nested?: ErrorElaboration[];
	} | {
		type: "enum";
		enum: string;
		actual: string;
	} | {
		type: "class";
		class: string;
		actual: string;
	} | {
		type: "missing";
	});

export type ValidatorResult = {
	success: true;
	elaboration?: undefined;
} | {
	success: false;
	elaboration: ErrorElaboration;
};

export const primitive = (
	ctx: ValidatorContext,
	expected: "string" | "number" | "boolean",
) =>
(value: any): ValidatorResult => {
	if (typeof value === expected) return { success: true };
	return {
		success: false,
		elaboration: {
			...ctx,
			type: "primitive",
			expected,
			actual: formatActualValue(value),
		},
	};
};

export const literal = (
	ctx: ValidatorContext,
	expected: string | number | boolean,
) =>
(value: any): ValidatorResult => {
	if (value === expected) return { success: true };
	return {
		success: false,
		elaboration: {
			...ctx,
			type: "literal",
			expected: formatActualValue(expected),
			actual: formatActualValue(value),
		},
	};
};

const enm = (
	ctx: ValidatorContext,
	name: string,
	values?: number[],
) =>
(value: any): ValidatorResult => {
	if (typeof value === "number") {
		if (!values) return { success: true };
		if (values.includes(value)) return { success: true };
	}
	return {
		success: false,
		elaboration: {
			...ctx,
			type: "enum",
			enum: name,
			actual: formatActualValue(value),
		},
	};
};

export { enm as enum };

export const undef =
	(ctx: ValidatorContext) => (value: any): ValidatorResult => {
		if (value === undefined) return { success: true };
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "primitive",
				expected: "undefined",
				actual: formatActualValue(value),
			},
		};
	};
export { undef as undefined };

export const nul = (ctx: ValidatorContext) => (value: any): ValidatorResult => {
	if (value === null) return { success: true };
	return {
		success: false,
		elaboration: {
			...ctx,
			type: "primitive",
			expected: "null",
			actual: formatActualValue(value),
		},
	};
};
export { nul as null };

export const date =
	(ctx: ValidatorContext) => (value: any): ValidatorResult => {
		if (value instanceof globalThis.Date) return { success: true };
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "date",
				actual: formatActualValue(value),
			},
		};
	};

export const array =
	(ctx: ValidatorContext, itemType: string, item: ValidatorFunction) =>
	(value: any): ValidatorResult => {
		if (!Array.isArray(value)) {
			return {
				success: false,
				elaboration: {
					...ctx,
					type: "array",
					itemType,
					actual: formatActualValue(value),
				},
			};
		}
		const results = value.map(item);
		results.forEach((r, index) => {
			if (!r.success) r.elaboration.index = index;
		});
		const failed: (ValidatorResult & { success: false })[] = results.filter(
			(r) => !r.success,
		);
		// Empty arrays pass the validation
		if (failed.length === 0) return { success: true };

		return {
			success: false,
			elaboration: {
				...ctx,
				type: "array",
				itemType,
				actual: formatActualValue(value),
				nested: failed.map((r) => ({
					...r.elaboration,
					kind: "item",
				})),
			},
		};
	};

export const tuple =
	(ctx: ValidatorContext, tupleType: string, ...items: ValidatorFunction[]) =>
	(value: any): ValidatorResult => {
		if (!Array.isArray(value)) {
			return {
				success: false,
				elaboration: {
					...ctx,
					type: "tuple",
					tupleType,
					actual: formatActualValue(value),
				},
			};
		}

		if (value.length > items.length) {
			return {
				success: false,
				elaboration: {
					...ctx,
					type: "tuple",
					tupleType,
					actual: `tuple with ${value.length} items`,
				},
			};
		}

		const results = items.map((validator, index) => {
			const ret = validator(value[index]);
			if (!ret.success) ret.elaboration.index = index;
			return ret;
		});

		const failed: (ValidatorResult & { success: false })[] = results.filter(
			(r) => !r.success,
		);
		if (failed.length === 0) return { success: true };

		return {
			success: false,
			elaboration: {
				...ctx,
				type: "tuple",
				tupleType,
				actual: `tuple with ${value.length} items`,
				nested: failed.map((r) => ({
					...r.elaboration,
					kind: "item",
				})),
			},
		};
	};

export const object = (
	ctx: ValidatorContext,
	objectType: string,
	properties: Record<string, ValidatorFunction>,
) =>
(value: any): ValidatorResult => {
	if (
		typeof value !== "object" || Array.isArray(value) || value === null
	) {
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "object",
				objectType,
				actual: formatActualValue(value),
			},
		};
	}

	const result: ErrorElaboration[] = [];
	for (const [prop, validator] of Object.entries(properties)) {
		const ret = validator(value[prop]);
		if (!ret.success) {
			ret.elaboration.kind = "property";
			result.push(ret.elaboration);
		}
	}

	if (result.length === 0) return { success: true };

	return {
		success: false,
		elaboration: {
			...ctx,
			type: "object",
			objectType,
			actual: "", // not relevant
			nested: result,
		},
	};
};

const klass = (
	ctx: ValidatorContext,
	name: string,
	klass: new (...args: any[]) => any,
) =>
(value: any): ValidatorResult => {
	// First do an instanceof check
	if (value instanceof klass) return { success: true };
	// Then try to call the class's static isXyz method
	if (
		typeof (klass as any)[`is${name}`] === "function"
		&& (klass as any)[`is${name}`](value)
	) {
		return { success: true };
	}

	return {
		success: false,
		elaboration: {
			...ctx,
			type: "class",
			class: name,
			actual: formatActualValue(value),
		},
	};
};

export { klass as class };

export const uint8array =
	(ctx: ValidatorContext) => (value: any): ValidatorResult => {
		if (isUint8Array(value)) return { success: true };
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "uint8array",
				actual: formatActualValue(value),
			},
		};
	};

export const optional =
	(ctx: ValidatorContext, otherwise: ValidatorFunction) =>
	(value: any): ValidatorResult => {
		if (value === undefined) return { success: true };
		const result = otherwise(value);
		if (result.success) return result;
		return {
			success: false,
			elaboration: {
				...result.elaboration,
				optional: true,
			},
		};
	};

export const oneOf = (
	ctx: ValidatorContext,
	typeName: string | undefined,
	...nested: ValidatorFunction[]
) =>
(value: any): ValidatorResult => {
	if (!nested.length) {
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "missing",
			},
		};
	}

	const failed: (ValidatorResult & { success: false })[] = [];
	for (const f of nested) {
		const result = f(value);
		if (result.success) return result;
		failed.push(result);
	}

	return {
		success: false,
		elaboration: {
			...ctx,
			type: "union",
			typeName,
			actual: formatActualValue(value),
			actualType: formatActualType(value),
			nested: failed.map((r) => r.elaboration),
		},
	};
};

export const allOf = (
	ctx: ValidatorContext,
	typeName: string | undefined,
	...nested: ValidatorFunction[]
) =>
(value: any): ValidatorResult => {
	if (!nested.length) {
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "missing",
			},
		};
	}

	const results = nested.map((f) => f(value));
	const failed = results.filter((r) => !r.success);
	if (failed.length === 0) return { success: true };

	return {
		success: false,
		elaboration: {
			...ctx,
			type: "intersection",
			typeName,
			actual: formatActualValue(value),
			nested: failed.map((r) => r.elaboration),
		},
	};
};

export function assert(...results: ValidatorResult[]): void {
	const failed = results.filter((r) => !r.success);
	if (failed.length > 0) {
		const message = `Argument validation failed:
${failed.map((r) => formatElaboration(r.elaboration)).join("\n")}`;
		throw new ZWaveError(message, ZWaveErrorCodes.Argument_Invalid);
	}
}
