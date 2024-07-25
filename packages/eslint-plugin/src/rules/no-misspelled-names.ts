import { type AST } from "jsonc-eslint-parser";
import { type JSONCRule } from "../utils.js";

interface CommonError {
	pattern: string | RegExp;
	fixed: string;
}

const commonErrors: CommonError[] = [
	{ pattern: "switch binary", fixed: "Binary Switch" },
	{ pattern: "switch multilevel", fixed: "Multilevel Switch" },
	{ pattern: "sensor binary", fixed: "Binary Sensor" },
	{ pattern: "sensor multilevel", fixed: "Multilevel Sensor" },
];

function fixCommonErrors(str: string): string {
	for (const { pattern, fixed } of commonErrors) {
		const regex = typeof pattern === "string"
			? new RegExp(`\\b${pattern}\\b`, "gi")
			: pattern;
		str = str.replaceAll(regex, fixed);
	}
	return str;
}

export const noMisspelledNames: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Fix some common misspellings in labels and descriptions
			"JSONProperty[key.value='label'], JSONProperty[key.value='description']"(
				node: AST.JSONProperty,
			) {
				debugger;
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;

				const fixed = fixCommonErrors(node.value.raw);
				if (fixed === node.value.raw) return;

				context.report({
					loc: node.value.loc,
					messageId: "change-to-fixed",
					data: { fixed },
					fix: (fixer) =>
						fixer.replaceTextRange(node.value.range, fixed),
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				`Prevents some common misspellings in labels and descriptions`,
		},
		fixable: "code",
		schema: [],
		messages: {
			"change-to-fixed": `Change to "{{fixed}}"`,
		},
		type: "problem",
	},
};
