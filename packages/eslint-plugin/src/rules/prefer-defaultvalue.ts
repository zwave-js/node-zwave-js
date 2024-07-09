import { type AST } from "jsonc-eslint-parser";
import { type JSONCRule } from "../utils.js";

export const preferDefaultValue: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Disallow "(default)" in labels and descriptions
			"JSONProperty[key.value='label'], JSONProperty[key.value='description']"(
				node: AST.JSONProperty,
			) {
				debugger;
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;

				const match = node.value.raw.match(/ *\(default\) */i);
				if (!match) return;
				const startsWithWhitespace = match[0].startsWith(" ");
				const endsWithWhitespace = match[0].endsWith(" ");
				const before = node.value.raw.slice(0, match.index);
				const after = node.value.raw.slice(
					match.index! + match[0].length,
				);

				const fixed = before
					+ (startsWithWhitespace && endsWithWhitespace ? " " : "")
					+ after;

				context.report({
					loc: node.value.loc,
					messageId: "no-default",
					fix: (fixer) =>
						fixer.replaceTextRange(node.value.range, fixed),
				});
			},
		};
	},
	meta: {
		docs: {
			description:
				`Ensures that the defaultValue property is used instead of mentioning in text that an option/value is the default`,
		},
		fixable: "code",
		schema: [],
		messages: {
			"no-default":
				"Do not use '(default)' in labels or descriptions. Use the 'defaultValue' property instead.",
		},
		type: "problem",
	},
};
