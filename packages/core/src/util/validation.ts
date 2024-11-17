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

function formatElaboration(e: ErrorElaboration, indent: number = 0): string {
	let ret: string = " ".repeat(indent * 2);
	const optional = e.optional ? "optional " : "";
	let what = `${optional}${e.kind} ${e.name}`;
	if (e.index != undefined) what += `[${e.index}]`;

	// TODO: Show actual value if it's a primitive type

	if (e.type === "primitive") {
		ret += `Expected ${what} to be a ${e.expected}, got ${e.actual}`;
	} else if (e.type === "null") {
		ret += `Expected ${what} to be null, got ${e.actual}`;
	} else if (e.type === "undefined") {
		ret += `Expected ${what} to be undefined, got ${e.actual}`;
	} else if (e.type === "union") {
		ret += `Expected ${what} to be one of ${
			// FIXME: This is wrong I think
			e.nested.map((n) => n.name).join(" | ")}`;
		const allPrimitive = e.nested.every((n) =>
			n.type === "primitive"
			|| n.type === "null"
			|| n.type === "undefined"
		);
		if (allPrimitive || primivitiveTypes.has(e.actual)) {
			ret += `, got ${e.actual}`;
		}
		for (const nested of e.nested) {
			ret += "\n"
				+ formatElaboration(
					addIndexToName(nested, e.index),
					indent + 1,
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
	} else {
		assertNever(e.type);
	}

	return ret;
}

function formatActualType(value: any): string {
	if (value === null) return "null";
	const type = typeof value;
	if (primivitiveTypes.has(type)) return type;
	if (typeof value === "function") return "function";
	if (Array.isArray(value)) return "array";
	// TODO: Elaborate on object and arrays a bit, detect classes/functions
	return "object";
}

function formatActualValue(value: any): string {
	switch (typeof value) {
		case "string":
			return `"${value}"`;
		case "number":
		case "boolean":
			return value.toString();

		case "undefined":
		case "function":
			return typeof value;
	}

	if (Array.isArray(value)) return "(array)";
	if (value === null) return "null";
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
		expected: "string" | "number" | "boolean";
		actual: string;
	} | {
		type: "null" | "undefined";
		actual: string;
	} | {
		type: "date";
		actual: string;
	} | {
		type: "uint8array";
		actual: string;
	} | {
		type: "union";
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
			actual: formatActualType(value),
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
			actual: values ? formatActualValue(value) : formatActualType(value),
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
				type: "undefined",
				actual: formatActualType(value),
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
			type: "null",
			actual: formatActualType(value),
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
				actual: formatActualType(value),
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
					actual: formatActualType(value),
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
				actual: formatActualType(value),
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
					actual: formatActualType(value),
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
				actual: formatActualType(value),
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

export const uint8array =
	(ctx: ValidatorContext) => (value: any): ValidatorResult => {
		if (isUint8Array(value)) return { success: true };
		return {
			success: false,
			elaboration: {
				...ctx,
				type: "uint8array",
				actual: formatActualType(value),
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

export const oneOf =
	(ctx: ValidatorContext, ...nested: ValidatorFunction[]) =>
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

		// FIXME: The formatting of this is incorrect. Ideally we'd have text like this
		// Expected parameter foo to be one of number | string | boolean, got object
		// or
		// Expected parameter foo to be one of Foo | Bar
		//   parameter foo is not assignable to Foo:
		//     ... elaboration of Foo error path (foo is object)
		//   parameter foo is not assignable to Bar:
		//     ... elaboration of Bar error path (foo is object)
		// or
		// Expected parameter foo to be one of number | Foo, got boolean (foo is primitive)
		// or
		// Expected parameter foo to be one of Foo | number
		//   parameter foo is not assignable to Foo:
		//     ... elaboration of Foo error path (foo is object)

		return {
			success: false,
			elaboration: {
				...ctx,
				type: "union",
				actual: formatActualType(value),
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
