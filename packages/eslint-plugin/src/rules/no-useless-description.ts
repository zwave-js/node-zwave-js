import { type AST } from "jsonc-eslint-parser";
import { CONFIG_PARAM } from "../jsonSelectors.js";
import { type JSONCRule, removeJSONProperty } from "../utils.js";

export const noUselessDescription: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Disallow "empty" param descriptions
			[`${CONFIG_PARAM} > JSONProperty[key.value='description']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;

				const description = value.value.trim();

				switch (description) {
					case "":
					case "0":
					case "false": {
						context.report({
							loc: node.loc,
							messageId: "no-useless-description",
							data: {
								what: description,
							},
							fix: removeJSONProperty(context, node),
						});
					}
				}
			},
		};
	},
	meta: {
		docs: {
			description: `Disallows "empty" and useless descriptions`,
		},
		fixable: "code",
		schema: [],
		messages: {
			"no-useless-description": "The description {{what}} is not allowed",
		},
		type: "problem",
	},
};
