import type { AST } from "jsonc-eslint-parser";
import { type JSONCRule, removeJSONProperty } from "../utils.js";

export const noUnnecessaryMinMaxValue: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}
		return {
			// Avoid unnecessary min/max value in parameters with predefined options
			"JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression"(
				node: AST.JSONObjectExpression,
			) {
				// Imports can make it necessary to override min/maxValue
				const hasImport = node.properties.some((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "$import"
				);
				if (hasImport) return;

				const allowManualEntryFalse = node.properties.some((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "allowManualEntry"
					&& p.value.type === "JSONLiteral"
					&& p.value.value === false
				);
				if (!allowManualEntryFalse) return;

				const hasOptions = node.properties.some((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "options"
					&& p.value.type === "JSONArrayExpression"
					&& p.value.elements.length > 0
				);
				if (!hasOptions) return;

				const minValue = node.properties.find((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "minValue"
				);
				if (minValue) {
					context.report({
						loc: minValue.loc,
						messageId: "no-min-value",
						fix: removeJSONProperty(context, minValue),
					});
				}

				const maxValue = node.properties.find((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "maxValue"
				);
				if (maxValue) {
					context.report({
						loc: maxValue.loc,
						messageId: "no-max-value",
						fix: removeJSONProperty(context, maxValue),
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description: "Ensures that min/maxValue are not used unnecessarily",
		},
		fixable: "code",
		schema: [],
		messages: {
			"no-min-value":
				`For parameters with "allowManualEntry = false" and predefined options, "minValue" is unnecessary and should not be specified.`,
			"no-max-value":
				`For parameters with "allowManualEntry = false" and predefined options, "maxValue" is unnecessary and should not be specified.`,
		},
		type: "problem",
	},
};
