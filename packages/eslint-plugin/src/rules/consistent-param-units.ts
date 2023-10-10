import type { AST } from "jsonc-eslint-parser";
import { CONFIG_PARAM } from "../jsonSelectors";
import { type JSONCRule } from "../utils";

interface FixableUnit {
	wrong: string[];
	correct: string;
}
const fixableUnits: FixableUnit[] = [
	{ wrong: ["sec", "s", "secs"], correct: "seconds" },
];

const correctUnits = new Set(fixableUnits.map(({ correct }) => correct));
// Create a map of lowercase variants of wrong units to the correct ones
const fixes = new Map(
	fixableUnits.flatMap(({ wrong, correct }) =>
		wrong.map((w) => [w, correct])
	),
);
// Also add the correct ones themselves, as they may be written with the wrong case
fixableUnits.forEach(({ correct }) =>
	fixes.set(correct.toLowerCase(), correct)
);

export const consistentParamUnits: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}
		return {
			// Ensure consistent ordering of properties in configuration parameters
			[`${CONFIG_PARAM} > JSONProperty[key.value='unit']`](
				node: AST.JSONProperty,
			) {
				if (node.value.type !== "JSONLiteral") return;
				if (typeof node.value.value !== "string") return;

				const unit = node.value.value;
				if (correctUnits.has(unit)) return;

				const lowercased = unit.toLowerCase();
				const fixed = fixes.get(lowercased);
				if (!fixed) return;

				context.report({
					loc: node.loc,
					messageId: "forbidden-unit",
					data: {
						unit,
						correct: fixed,
					},
					fix(fixer) {
						return fixer.replaceTextRange(
							node.value.range,
							`"${fixed}"`,
						);
					},
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				"Ensures that no forbidden units are used in config parameters.",
		},
		fixable: "code",
		schema: [],
		messages: {
			"forbidden-unit":
				`The unit "{{unit}}" is not allowed. Use "{{correct}}" instead.`,
		},
		type: "problem",
	},
};
