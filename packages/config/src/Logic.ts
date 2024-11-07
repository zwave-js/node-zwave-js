import { padVersion } from "@zwave-js/shared";
import semverEq from "semver/functions/eq.js";
import semverGt from "semver/functions/gt.js";
import semverGte from "semver/functions/gte.js";
import semverLt from "semver/functions/lt.js";
import semverLte from "semver/functions/lte.js";
import { parse } from "./LogicParser.js";

// The types are not correct:
import { type RulesLogic, default as JsonLogic } from "json-logic-js";
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

export function parseLogic(logic: string): RulesLogic {
	try {
		// The generated types for the version comparisons are not compatible with the RulesLogic type
		return parse(logic) as unknown as RulesLogic;
	} catch (e: any) {
		throw new Error(`Invalid logic: ${logic}\n${e.message}`);
	}
}

export function evaluate(
	logic: string,
	context: unknown,
): string | number | boolean {
	const rules = parseLogic(logic);
	return apply(rules, context);
}
