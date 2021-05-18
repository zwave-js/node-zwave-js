import { add_operation, apply, RulesLogic } from "json-logic-js";
import * as semver from "semver";
import { parse } from "./LogicParser";
import { padVersion } from "./utils";

// wotan-disable delete-only-optional-property

add_operation("ver >=", (a, b) => semver.gte(padVersion(a), padVersion(b)));
add_operation("ver >", (a, b) => semver.gt(padVersion(a), padVersion(b)));
add_operation("ver <=", (a, b) => semver.lte(padVersion(a), padVersion(b)));
add_operation("ver <", (a, b) => semver.lt(padVersion(a), padVersion(b)));
add_operation("ver ===", (a, b) => semver.eq(padVersion(a), padVersion(b)));

export function parseLogic(logic: string): RulesLogic {
	return parse(logic);
}

export function evaluate(
	logic: string,
	context: unknown,
): string | number | boolean {
	const rules = parseLogic(logic);
	return apply(rules, context);
}
