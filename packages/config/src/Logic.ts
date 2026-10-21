import { padVersion } from "@zwave-js/shared";
// The types are not correct:
import { type RulesLogic, default as JsonLogic } from "json-logic-js";
import semverEq from "semver/functions/eq.js";
import semverGt from "semver/functions/gt.js";
import semverGte from "semver/functions/gte.js";
import semverLt from "semver/functions/lt.js";
import semverLte from "semver/functions/lte.js";

import { parse, toRulesLogic } from "./LogicParser.js";
const { add_operation, apply } = JsonLogic;

function tryOr<T extends (...args: any[]) => any>(
	operation: T,
	onError: ReturnType<T>,
): T {
	return ((...args: any[]) => {
		try {
			return operation(...args);
		} catch {
			return onError;
		}
	}) as any as T;
}

add_operation(
	"ver >=",
	tryOr((a, b) => semverGte(padVersion(a), padVersion(b)), false),
);
add_operation(
	"ver >",
	tryOr((a, b) => semverGt(padVersion(a), padVersion(b)), false),
);
add_operation(
	"ver <=",
	tryOr((a, b) => semverLte(padVersion(a), padVersion(b)), false),
);
add_operation(
	"ver <",
	tryOr((a, b) => semverLt(padVersion(a), padVersion(b)), false),
);
add_operation(
	"ver ===",
	tryOr((a, b) => semverEq(padVersion(a), padVersion(b)), false),
);
add_operation(
	"ver !==",
	tryOr((a, b) => !semverEq(padVersion(a), padVersion(b)), false),
);

// Conditions come from a finite set of config files and are evaluated repeatedly, so parsing each only once pays off
const parsedLogicCache = new Map<string, RulesLogic>();

export function parseLogic(input: string): RulesLogic {
	let ret = parsedLogicCache.get(input);
	if (!ret) {
		const expr = parse(input);
		if (!expr) {
			throw new Error(`Failed to parse expression: ${input}`);
		}
		ret = toRulesLogic(expr);
		parsedLogicCache.set(input, ret);
	}
	return ret;
}

export function evaluate(
	logic: string,
	context: unknown,
): string | number | boolean {
	const rules = parseLogic(logic);
	return apply(rules, context);
}
