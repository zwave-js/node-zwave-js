import { type AST } from "jsonc-eslint-parser";
import { type JSONCRule } from "../utils";

const ROOT = "Program > JSONExpressionStatement > JSONObjectExpression";

function isSurroundedByWhitespace(str: string) {
	return /^\s/.test(str) || /\s$/.test(str);
}

const titleCaseExceptions = [
	"with",
	"in",
	"of",
	"by",
	"to",
	"or",
	"for",
	"the",
	"and",
	"kW",
	"kWh",
	"RFID",
];

const titleCaseIgnored: RegExp[] = [
	/^v\d+$/i, // Versions
	/^\d*x$/i, // 2x, 3x, x, ...
	/^[a-z]+[A-Z]/, // fancY mArketing nAmEs
	/[®™]$/i, // Trademarks etc.
];

const alwaysUppercase: RegExp[] = [
	/^\d+\w$/i,
];

// TODO: Additional fixes:
// Plug-In, In-Wall, 3-Way, 6-Channel
// remove Z-Wave and all its variants
// Title-Case hyphenated words

function isTitleCase(str: string) {
	const words = str.split(" ");
	return words.every((word, i) => {
		if (word.length === 0) return true;
		if (i > 0) {
			// Exceptions don't apply for the first word
			const exception = titleCaseExceptions.find(
				(ex) => ex.toLowerCase() === word.toLowerCase(),
			);
			if (exception) return word === exception;
		}
		if (titleCaseIgnored.some((re) => re.test(word))) return true;
		if (alwaysUppercase.some((re) => re.test(word))) {
			return word === word.toUpperCase();
		}

		return word[0] === word[0].toUpperCase();
	});
}

function toTitleCase(str: string) {
	const words = str.split(" ");
	return words.map((word, i) => {
		if (word.length === 0) return word;
		// Return some exceptions as they are defined
		if (i > 0) {
			// Exceptions don't apply for the first word
			const exception = titleCaseExceptions.find(
				(ex) => ex.toLowerCase() === word.toLowerCase(),
			);
			if (exception) return exception;
		}
		if (titleCaseIgnored.some((re) => re.test(word))) return word;
		if (alwaysUppercase.some((re) => re.test(word))) {
			return word.toUpperCase();
		}
		// Title case the rest
		return word[0].toUpperCase() + word.slice(1);
	}).join(" ");
}

export const consistentConfigLabels: JSONCRule.RuleModule = {
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

			// Enforce title case for device descriptions
			[`${ROOT} > JSONProperty[key.value='description']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;
				if (isTitleCase(value.value)) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-title-case",
					data: {
						what: "Device descriptions",
					},
					fix: (fixer) =>
						fixer.replaceTextRange(
							value.range,
							`"${toTitleCase(value.raw.slice(1, -1))}"`,
						),
				});
			},
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
			"must-be-title-case": "{{what}} must be in Title Case",
		},
		type: "problem",
	},
};
