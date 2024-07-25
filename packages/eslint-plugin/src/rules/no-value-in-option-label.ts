import { type AST } from "jsonc-eslint-parser";
import { CONFIG_OPTION } from "../jsonSelectors.js";
import { type JSONCRule, getJSONNumber } from "../utils.js";

const startsWithNumber = /^\d(?![\/-])/; // allow - and / as the next chars
const isNumberWithUnit = /^\d+(\.\d+)?\s?[°\w%µ]+/;
const isOnlyNumeric = /^\d+(\.\d+)?$/;

export const noValueInOptionLabel: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Disallow options labels that start with their value
			[`${CONFIG_OPTION} > JSONProperty[key.value='label']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;

				const value = node.value.value;
				if (
					startsWithNumber.test(value)
					&& !isNumberWithUnit.test(value)
				) {
					// Allow fully-numeric options that are different from their value
					if (isOnlyNumeric.test(value)) {
						const optionValue = getJSONNumber(node.parent, "value")
							?.value;
						if (optionValue !== parseFloat(value)) return;
					}

					context.report({
						loc: node.value.loc,
						messageId: "no-numeric-option",
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description: `Prevents option labels which start with their value`,
		},
		fixable: "code",
		schema: [],
		messages: {
			"no-numeric-option":
				"Option labels must not start with their value. Use the 'value' property instead.",
		},
		type: "problem",
	},
};
