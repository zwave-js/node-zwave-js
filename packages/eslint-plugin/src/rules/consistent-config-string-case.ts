import { type AST } from "jsonc-eslint-parser";
import { CONFIG_OPTION, CONFIG_PARAM, ROOT } from "../jsonSelectors.js";
import {
	type JSONCRule,
	insertAfterJSONProperty,
	insertBeforeJSONProperty,
} from "../utils.js";
import { toSentenceCase, toTitleCase } from "../utils/titleAndSentenceCase.js";

// TODO: Avoid Enable/Disable in param labels
// remove Z-Wave and all its variants

export const consistentConfigStringCase: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}

		return {
			// Enforce title case for device descriptions
			[`${ROOT} > JSONProperty[key.value='description']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;

				const rawValue = value.raw.slice(1, -1);
				const titleCase = toTitleCase(rawValue);
				if (rawValue === titleCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-title-case",
					data: {
						what: "Device descriptions",
					},
					suggest: [
						{
							messageId: "change-to-fixed",
							data: { fixed: titleCase },
							fix: (fixer) =>
								fixer.replaceTextRange(
									value.range,
									`"${titleCase}"`,
								),
						},
					],
				});
			},

			// Enforce title case for param labels
			[`${CONFIG_PARAM} > JSONProperty[key.value='label']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;

				const rawValue = value.raw.slice(1, -1);
				const titleCase = toTitleCase(rawValue, false);
				if (rawValue === titleCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-title-case",
					data: {
						what: "Param labels",
					},
					suggest: [
						{
							messageId: "change-to-fixed",
							data: { fixed: titleCase },
							fix: (fixer) =>
								fixer.replaceTextRange(
									value.range,
									`"${titleCase}"`,
								),
						},
					],
				});
			},

			// TODO: Enforce Sentence case for param descriptions - This is hard due to lots of false positives

			// Enforce sentence case for option labels
			[`${CONFIG_OPTION} > JSONProperty[key.value='label']`](
				node: AST.JSONProperty,
			) {
				debugger;
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;

				const rawValue = value.raw.slice(1, -1);
				const sentenceCase = toSentenceCase(rawValue, false);
				if (rawValue === sentenceCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-sentence-case",
					data: {
						what: "Parameter descriptions",
					},
					suggest: [
						{
							messageId: "change-to-fixed",
							data: { fixed: sentenceCase },
							fix: (fixer) =>
								fixer.replaceTextRange(
									value.range,
									`"${sentenceCase}"`,
								),
						},
						{
							messageId: "disable-for-all-options",
							fix: function*(fixer) {
								const options = node.parent.parent
									.parent as AST.JSONProperty;

								yield* insertBeforeJSONProperty(
									context,
									options,
									`/* eslint-disable ${context.id} */`,
									{ isComment: true },
								)(fixer);
								yield* insertAfterJSONProperty(
									context,
									options,
									`/* eslint-enable ${context.id} */`,
								)(fixer);
							},
						},
					],
				});
			},
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
			"must-be-title-case": "{{what}} must be in Title Case",
			"must-be-sentence-case": "{{what}} must be in Sentence case",
			"change-to-fixed": `Change to "{{fixed}}"`,
			"disable-for-all-options":
				`Disable for all options of this parameter`,
		},
		type: "problem",
	},
};
