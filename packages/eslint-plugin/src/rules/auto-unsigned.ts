import { getIntegerLimits, tryParseParamNumber } from "@zwave-js/core";
import type { AST } from "jsonc-eslint-parser";
import {
	type JSONCRule,
	getJSONBoolean,
	getJSONNumber,
	getJSONString,
	insertAfterJSONProperty,
	insertBeforeJSONProperty,
	paramInfoPropertyOrder,
	removeJSONProperty,
} from "../utils";

export const autoUnsigned: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}
		return {
			// Ensure `unsigned` is only used when necessary and not used when not
			"JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression"(
				node: AST.JSONObjectExpression,
			) {
				// We cannot handle imports yet
				const hasImport = node.properties.some((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "$import"
				);
				if (hasImport) return;

				// We cannot handle partial parameters yet
				const paramStr = getJSONString(node, "#")?.value;
				if (!paramStr) return;
				const parsedParameter = tryParseParamNumber(paramStr);
				if (!parsedParameter) return;
				const { valueBitMask } = parsedParameter;

				// TODO: Properly support partial parameters
				if (valueBitMask) return;

				// We're also not looking at options with allowManualEntry = false yet
				const allowManualEntry =
					getJSONBoolean(node, "allowManualEntry")?.value !== false;
				const hasOptions = node.properties.some((p) =>
					p.key.type === "JSONLiteral"
					&& p.key.value === "options"
					&& p.value.type === "JSONArrayExpression"
					&& p.value.elements.length > 0
				);

				// TODO: Look at options
				if (!allowManualEntry && hasOptions) return;

				const valueSizeProperty = getJSONNumber(node, "valueSize");
				if (!valueSizeProperty) return;
				const { value: valueSize } = valueSizeProperty;

				const minValueProperty = getJSONNumber(node, "minValue");
				if (!minValueProperty) return;
				const { value: minValue } = minValueProperty;

				const maxValueProperty = getJSONNumber(node, "maxValue");
				if (!maxValueProperty) return;
				const { value: maxValue } = maxValueProperty;

				const unsignedProperty = getJSONBoolean(node, "unsigned");
				const isUnsigned = !!unsignedProperty?.value;

				// Determine if the min/max value match the value size
				const limits = getIntegerLimits(valueSize as any, true);
				const unsignedLimits = getIntegerLimits(
					valueSize as any,
					false,
				);
				if (!limits) {
					context.report({
						loc: valueSizeProperty.node.loc,
						messageId: "invalid-value-size",
						data: { valueSize: valueSize.toString() },
					});
					return;
				}

				const fitsSignedLimits = minValue >= limits.min
					&& minValue <= limits.max
					&& maxValue >= limits.min
					&& maxValue <= limits.max;
				const fitsUnsignedLimits = minValue >= unsignedLimits.min
					&& minValue <= unsignedLimits.max
					&& maxValue >= unsignedLimits.min
					&& maxValue <= unsignedLimits.max;

				if (!isUnsigned && !fitsSignedLimits) {
					if (fitsUnsignedLimits) {
						// Find the property after which we should insert the unsigned property
						const unsignedIndex = paramInfoPropertyOrder.indexOf(
							"unsigned",
						);
						const insertAfter = node.properties.findLast((p) =>
							p.key.type === "JSONLiteral"
							&& typeof p.key.value === "string"
							&& paramInfoPropertyOrder.indexOf(p.key.value)
								< unsignedIndex
						);
						context.report({
							loc: valueSizeProperty.node.loc,
							messageId: "incompatible-size",
							data: {
								minValue: minValue.toString(),
								maxValue: maxValue.toString(),
								valueSize: valueSize.toString(),
								sizeMin: limits.min.toString(),
								sizeMax: limits.max.toString(),
							},
							suggest: [
								{
									messageId: "convert-to-unsigned",
									fix: insertAfter
										? insertAfterJSONProperty(
											context,
											insertAfter,
											`"unsigned": true,`,
											{ insertComma: true },
										)
										: insertBeforeJSONProperty(
											context,
											node.properties[0],
											`"unsigned": true,`,
										),
								},
							],
						});
					} else {
						if (minValue < limits.min) {
							context.report({
								loc: minValueProperty.node.loc,
								messageId: "incompatible-min-value",
								data: {
									minValue: minValue.toString(),
									valueSize: valueSize.toString(),
									sizeMin: limits.min.toString(),
								},
							});
						}
						if (maxValue > limits.max) {
							context.report({
								loc: maxValueProperty.node.loc,
								messageId: "incompatible-max-value",
								data: {
									maxValue: maxValue.toString(),
									valueSize: valueSize.toString(),
									sizeMax: limits.max.toString(),
								},
							});
						}
					}
				} else if (isUnsigned && !fitsUnsignedLimits) {
					if (minValue < unsignedLimits.min) {
						context.report({
							loc: minValueProperty.node.loc,
							messageId: "incompatible-min-value",
							data: {
								minValue: minValue.toString(),
								valueSize: valueSize.toString(),
								sizeMin: unsignedLimits.min.toString(),
							},
						});
					}
					if (maxValue > unsignedLimits.max) {
						context.report({
							loc: maxValueProperty.node.loc,
							messageId: "incompatible-max-value",
							data: {
								maxValue: maxValue.toString(),
								valueSize: valueSize.toString(),
								sizeMax: unsignedLimits.max.toString(),
							},
						});
					}
				} else if (isUnsigned && fitsSignedLimits) {
					context.report({
						loc: unsignedProperty.node.loc,
						messageId: "unnecessary-unsigned",
						fix: removeJSONProperty(
							context,
							unsignedProperty.node,
						),
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description:
				`Ensures that "unsigned = true" is used when necessary and omitted when not.`,
		},
		fixable: "code",
		hasSuggestions: true,
		schema: [],
		messages: {
			"invalid-value-size": "Value size {{valueSize}} is invalid!",
			"incompatible-size":
				"The defined value range {{minValue}}...{{maxValue}} is incompatible with valueSize {{valueSize}} ({{sizeMin}}...{{sizeMax}})",
			"incompatible-min-value":
				"minValue {{minValue}} is incompatible with valueSize {{valueSize}} (min = {{sizeMin}})",
			"incompatible-max-value":
				"maxValue {{maxValue}} is incompatible with valueSize {{valueSize}} (max = {{sizeMax}})",
			"convert-to-unsigned": "Convert this parameter to unsigned",
			"unnecessary-unsigned":
				"Defining this parameter as unsigned is unnecessary",
		},
		type: "problem",
	},
};
