import { type AST } from "jsonc-eslint-parser";
import { type JSONCRule } from "../utils.js";

function isSurroundedByWhitespace(str: string) {
	return /^\s/.test(str) || /\s$/.test(str);
}

export const noSurroundingWhitespace: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Disallow surrounding whitespace
			JSONLiteral(node: AST.JSONLiteral) {
				if (typeof node.value !== "string") return;
				if (!isSurroundedByWhitespace(node.value)) return;

				context.report({
					loc: node.loc,
					messageId: "no-surrounding-whitespace",
					fix: (fixer) =>
						fixer.replaceTextRange(
							node.range,
							`"${node.raw.slice(1, -1).trim()}"`,
						),
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				`Prevents strings in configuration files to be surrounded by whitespace`,
		},
		fixable: "code",
		schema: [],
		messages: {
			"no-surrounding-whitespace":
				"Leading and trailing whitespace is not allowed",
		},
		type: "problem",
	},
};
