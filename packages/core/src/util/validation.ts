import { assertNever } from "alcalzone-shared/helpers";
import { ZWaveError, ZWaveErrorCodes } from "../index_browser.js";

const primivitiveTypes = new Set([
	"string",
	"number",
	"boolean",
	"null",
	"undefined",
]);

function formatElaboration(e: ErrorElaboration, indent: number = 0): string {
	let ret: string = " ".repeat(indent * 2);
	const optional = e.optional ? "optional " : "";
	if (e.type === "primitive") {
		ret +=
			`Expected ${optional}${e.kind} ${e.name} to be a ${e.expected}, got ${e.actual}`;
	} else if (e.type === "null") {
		ret +=
			`Expected ${optional}${e.kind} ${e.name} to be null, got ${e.actual}`;
	} else if (e.type === "undefined") {
		ret +=
			`Expected ${optional}${e.kind} ${e.name} to be undefined, got ${e.actual}`;
	} else if (e.type === "union") {
		ret += `Expected ${optional}${e.kind} ${e.name} to be one of ${
			e.nested.map((n) => n.name).join(" | ")
		}`;
		const allPrimitive = e.nested.every((n) =>
			n.type === "primitive"
			|| n.type === "null"
			|| n.type === "undefined"
		);
		if (allPrimitive || primivitiveTypes.has(e.actual)) {
			ret += `, got ${e.actual}`;
		}
		for (const nested of e.nested) {
			ret += "\n" + formatElaboration(nested, indent + 1);
		}
	} else if (e.type === "enum") {
		ret +=
			`Expected ${optional}${e.kind} ${e.name} to be a member of enum ${e.enum}, got ${e.actual}`;
	} else if (e.type === "date") {
		ret +=
			`Expected ${optional}${e.kind} ${e.name} to be a Date, got ${e.actual}`;
	} else if (e.type === "missing") {
		ret += `ERROR: Missing validation for ${optional}${e.kind} ${e.name}`;
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
	kind: "parameter" | "object" | "property";
	name: string;
}

export type ValidatorFunction = (value: any) => ValidatorResult;

type ErrorElaboration =
	& ValidatorContext
	& {
		optional?: boolean;
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
		type: "union";
		actual: string;
		nested: ErrorElaboration[];
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
