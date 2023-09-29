import { type AST } from "jsonc-eslint-parser";
import { type JSONCRule } from "../utils";

// const ROOT = "Program > JSONObjectExpression";

function isSurroundedByWhitespace(str: string) {
	return /^\s/.test(str) || /\s$/.test(str);
}

export const consistentConfigLabels: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
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
			// [`${ROOT} > JSONProperty[key.value='description']`](
			// 	node: AST.JSONProperty,
			// ) {
			// },

			// "JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression"(
			// 	node: AST.JSONObjectExpression,
			// ) {
			// },
		};
	},
	meta: {
		docs: {
			description:
				`Ensures that the casing of labels in configuration files follows the style guide`,
		},
		fixable: "code",
		hasSuggestions: true,
		schema: [],
		messages: {
			"no-surrounding-whitespace":
				"Leading and trailing whitespace is not allowed",
		},
		type: "problem",
	},
};
