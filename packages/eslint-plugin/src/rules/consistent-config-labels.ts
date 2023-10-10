import { type AST } from "jsonc-eslint-parser";
import {
	type JSONCRule,
	insertAfterJSONProperty,
	insertBeforeJSONProperty,
} from "../utils";

// TODO: Title Case param labels, forbid . at the end of label and options, Avoid Enable/Disable in param labels
// Avoid default in option labels, forbid numbers at the start of option labels (except units)
// Sensor Binary -> Binary Sensor
// Remove separators before the first actual word
// Labels should not start with "Set" or "The"

const ROOT = "Program > JSONExpressionStatement > JSONObjectExpression";
const CONFIG_PARAM =
	"JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression";
const CONFIG_OPTIONS = `${CONFIG_PARAM} > JSONProperty[key.value='options']`;
const CONFIG_OPTION =
	`${CONFIG_OPTIONS} > JSONArrayExpression > JSONObjectExpression`;

function isSurroundedByWhitespace(str: string) {
	return /^\s/.test(str) || /\s$/.test(str);
}

const wordSeparators = new Set([
	"-",
	"/",
	".",
	",",
	";",
	":",
	"(",
	")",
	" ",
]);

interface Word {
	word: string;
	suffix: string;
}

function joinWords(words: Word[]): string {
	return words.map((w) => w.word + w.suffix).join("");
}

function isEndOfSentence(suffix: string, strict: boolean): boolean {
	if (strict) {
		return suffix.trim() === ".";
	}
	if (suffix === " - " || suffix === " / ") return true;
	suffix = suffix.trim();
	return [
		".",
		":",
		";",
		"(",
	].some((c) => suffix.endsWith(c));
}

function isHyphenatedWord(str: string): boolean {
	return str.includes("-");
}

function isCombinedWord(str: string): boolean {
	return str.includes("/");
}

const titleCaseExceptions = [
	"with",
	"without",
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
	"Wh",
	"via",
	"RFID",
	"LEDs",
];

function combinations(...fragments: string[][]): string[] {
	// Generate all combinations of all fragments
	const ret: string[] = [];
	const recurse = (i: number, current: string) => {
		if (i === fragments.length) {
			ret.push(current);
			return;
		}
		for (const fragment of fragments[i]) {
			recurse(
				i + 1,
				current + ((current && fragment) ? " " : "") + fragment,
			);
		}
	};
	recurse(0, "");
	return ret;
}

const ccAndCommandNames = combinations(
	[
		"Basic",
		"Multilevel Switch",
		"Notification",
		"Binary Sensor",
		"Binary Switch",
		"Hail",
		"Configuration",
		"Barrier",
		"Thermostat Setpoint",
		"Thermostat Mode",
		"Central Scene",
		"Scene Activation",
		"Meter",
		"Indicator",
	],
	[
		"Command Class",
		...combinations(
			["", "CC"],
			["", "Set", "Report", "Set/Get", "Get/Set", "Get"],
		),
	],
)
	.filter((w) => w.includes(" "));
// .sort((a, b) => {
// 	// These need to be ordered from maximum number of words to minimum number of words so the most specific ones match first
// 	const numWordsA = a.split(" ").length;
// 	const numWordsB = b.split(" ").length;
// 	return numWordsB - numWordsA;
// });

const fixedMultiWordNames = [
	...ccAndCommandNames,
	"Command Class",
	"Central Scene Notification",
].sort((a, b) => {
	// These need to be ordered from maximum number of words to minimum number of words so the most specific ones match first
	const numWordsA = a.split(" ").length;
	const numWordsB = b.split(" ").length;
	return numWordsB - numWordsA;
});

// Names are always written the same way, whether they appear at the beginning of a sentence or not
const fixedNames = [
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
	"Sunday",
	"Z-Wave",
	"Fibaro",
	"Lifeline",
	// Languages:
	"English",
	"French",
	"German",
	"Italian",
	"Spanish",
	"Dutch",
	"Danish",
	"Norwegian",
	"Swedish",
	"Finnish",
	"Arabic",
	...fixedMultiWordNames,
];

const sentenceCaseIgnored: (RegExp)[] = [
	// emphasis:
	/^NOT$/,
	// Units:
	/^\d+(\.\d+)?°?[smCF]$/,
	/^[VWA]$/,
	/^Wh$/,
	/^ms$/,
	/^°[CF]$/,
	// Common abbreviations:
	/^N[CO]$/,
	/^CCW$/,
	// Device labels
	/^[\w\/-]+\d+/,
];

const titleCaseIgnored: RegExp[] = [
	/^v\d+$/i, // Versions
	/^\d*x$/i, // 2x, 3x, x, ...
	/^[a-z]+[A-Z]/, // fancY mArketing nAmEs
	/[®™]$/i, // Trademarks etc.
	// Units:
	/^\d+(\.\d+)?°?[smCF]$/,
	/^ms$/,
	/^on$/i, // On/on has two different meanings, just leave it as-is
];

const alwaysUppercase: RegExp[] = [
	/^\d+\w$/i,
	/^LED$/i,
	/^CFL$/i,
	/^RFID$/i,
	/^RGBW?$/i,
	/^NTC?$/i,
	/^CO2?$/i,
	/^A[CV]$/i,
	/^IR$/i,
	/^USB$/i,
	/^MOSFET$/i,
	/^PWM$/i,
	/^VSP$/i,
	/^PIR$/i,
	/^PIN$/i,
	/^PID$/i,
	/^OK$/i,
	/^HSB$/i,
	/^OTA$/i,
	/^CRC$/i,
	/^UI$/i,
	/^U[KS]$/i,
	/^[AP]M$/i,
];

const alwaysLowercase: RegExp[] = [
	/^\d+-in-\d+$/i,
];

// TODO: Additional fixes:
// Plug-In, In-Wall, 3-Way, 6-Channel
// remove Z-Wave and all its variants

const splitIntoWordsCache = new Map<string, Word[]>();

function splitIntoWords(str: string): Word[] {
	if (splitIntoWordsCache.has(str)) return splitIntoWordsCache.get(str)!;

	const ret: Word[] = [];
	let currentWord = "";
	let currentSuffix = "";
	for (let i = 0; i < str.length; i++) {
		const char = str[i];
		if (wordSeparators.has(char)) {
			currentSuffix += char;
		} else {
			// This is part of a word
			if (currentSuffix.length > 0) {
				// The previous word was still collecting the suffix. Finish it.
				ret.push({
					word: currentWord,
					suffix: currentSuffix,
				});
				currentWord = "";
				currentSuffix = "";
			}
			currentWord += char;
		}
	}
	// Collect the remainder
	if (currentWord.length > 0) {
		ret.push({
			word: currentWord,
			suffix: currentSuffix,
		});
	}

	// We might have split a bit too much, so merge some words back together:
	// Hyphenated words: Foo-Bar
	// Combined words: Foo/Bar

	for (let i = ret.length - 2; i >= 0; i--) {
		if (ret[i].suffix === "-" || ret[i].suffix === "/") {
			ret.splice(i, 2, {
				word: ret[i].word + ret[i].suffix + ret[i + 1].word,
				suffix: ret[i + 1].suffix,
			});
		}
	}

	// Multi-word names: Basic CC Set, Multilevel Switch Report, ...
	// TODO: If performance becomes an issue due to the number of combinations look at this nested loop again.
	// For now, caching is good enough.
	for (const multiWordName of fixedMultiWordNames) {
		const wordParts = multiWordName.split(" ").map((w) => w.toLowerCase());
		const numWords = wordParts.length;
		outer: for (let i = 0; i <= ret.length - numWords; i++) {
			for (let n = 0; n < numWords; n++) {
				// Does the current word match?
				if (ret[i + n].word.toLowerCase() !== wordParts[n]) {
					continue outer;
				}
				// Is there a space between the words?
				if (n < numWords - 1 && ret[i + n].suffix !== " ") {
					continue outer;
				}

				if (n === numWords - 1) {
					// All words match
					ret.splice(i, numWords, {
						word: multiWordName,
						suffix: ret[i + numWords - 1].suffix,
					});
				}
			}
		}
	}

	splitIntoWordsCache.set(str, ret);
	return ret;
}

function titleCaseWord(
	word: string,
	isFirstWord: boolean,
	ignoreExceptions: boolean = false,
): string {
	if (word.length === 0) return word;
	// Ignore COMMAND_CLASS_NAMES
	if (word.includes("_")) return word;

	const lowercase = word.toLowerCase();
	const uppercase = word.toUpperCase();

	// Names are always written the same
	{
		const fixed = fixedNames.find((n) => n.toLowerCase() === lowercase);
		if (fixed) return fixed;
	}
	if (!isFirstWord && !ignoreExceptions) {
		// Exceptions don't apply for the first word
		const exception = titleCaseExceptions.find(
			(ex) => ex.toLowerCase() === lowercase,
		);
		if (exception) return exception;
	}
	if (titleCaseIgnored.some((re) => re.test(word))) return word;
	if (alwaysUppercase.some((re) => re.test(word))) {
		return uppercase;
	}
	if (alwaysLowercase.some((re) => re.test(word))) {
		return lowercase;
	}
	if (isHyphenatedWord(word)) {
		return word
			.split("-")
			.map((w) => titleCaseWord(w, isFirstWord, true))
			.join("-");
	}
	// Title Case the rest
	return word[0].toUpperCase() + word.slice(1);
}

const titleCaseCache = new Map<string, string>();

function toTitleCase(str: string) {
	if (titleCaseCache.has(str)) return titleCaseCache.get(str)!;

	const words = splitIntoWords(str)
		.map(({ word, suffix }, i, words) => {
			const isFirstWord = i === 0
				|| isEndOfSentence(words[i - 1].suffix, false);
			return {
				word: titleCaseWord(word, isFirstWord),
				suffix: suffix,
			};
		});
	const ret = joinWords(words);
	titleCaseCache.set(str, ret);
	return ret;
}

function sentenceCaseWord(word: string, isFirstWord: boolean): string {
	if (word.length === 0) return word;
	// Ignore COMMAND_CLASS_NAMES
	if (word.includes("_")) return word;

	const uppercase = word.toUpperCase();
	const lowercase = word.toLowerCase();

	// Names are always written the same
	{
		const fixed = fixedNames.find((n) => n.toLowerCase() === lowercase);
		if (fixed) return fixed;
	}
	// Return some exceptions as they are defined
	if (!isFirstWord) {
		// Exceptions don't apply for the first word in each sentence
		const exception = titleCaseExceptions.find(
			(ex) => ex.toLowerCase() === lowercase,
		);
		if (exception) exception;
	}
	if (
		titleCaseIgnored.some((re) => re.test(word))
		|| sentenceCaseIgnored.some((re) => re.test(word))
	) {
		return word;
	}
	if (alwaysUppercase.some((re) => re.test(word))) {
		return uppercase;
	}
	if (alwaysLowercase.some((re) => re.test(word))) {
		return lowercase;
	}

	// Lowercase fully uppercase words before normalizing
	if (word === word.toUpperCase()) {
		word = lowercase;
	}

	if (isHyphenatedWord(word)) {
		return word
			.split("-")
			.map((w) => sentenceCaseWord(w, isFirstWord))
			.join("-");
	} else if (isCombinedWord(word)) {
		return word
			.split("/")
			.map((w) => sentenceCaseWord(w, isFirstWord))
			.join("/");
	}

	// Sentence case the rest
	return (isFirstWord
		// First word Uppercase
		? word[0].toUpperCase()
		// Other words lowercase
		: word[0].toLowerCase()) + word.slice(1);
}

const sentenceCaseCache = new Map<string, string>();

function toSentenceCase(str: string) {
	if (sentenceCaseCache.has(str)) return sentenceCaseCache.get(str)!;

	const words = splitIntoWords(str)
		.map(({ word, suffix }, i, words) => {
			const isFirstWord = i === 0
				|| isEndOfSentence(words[i - 1].suffix, false);
			return {
				word: sentenceCaseWord(word, isFirstWord),
				suffix: suffix,
			};
		});
	const ret = joinWords(words);
	sentenceCaseCache.set(str, ret);
	return ret;
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

				const rawValue = value.raw.slice(1, -1);
				const titleCase = toTitleCase(rawValue);
				if (rawValue === titleCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-title-case",
					data: {
						what: "Device descriptions",
					},
					// suggest: [
					// 	{
					// 		messageId: "change-to-fixed",
					// 		data: { fixed },
					fix: (fixer) =>
						fixer.replaceTextRange(
							value.range,
							`"${titleCase}"`,
						),
					// 	},
					// ],
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
				const titleCase = toTitleCase(rawValue);
				if (rawValue === titleCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-title-case",
					data: {
						what: "Param labels",
					},
					// suggest: [
					// 	{
					// 		messageId: "change-to-fixed",
					// 		data: { fixed },
					fix: (fixer) =>
						fixer.replaceTextRange(
							value.range,
							`"${titleCase}"`,
						),
					// 	},
					// ],
				});
			},

			// TODO: Enforce Sentence case for param descriptions - This is hard due to lots of false positives

			// Enforce sentence case for option labels
			[`${CONFIG_OPTION} > JSONProperty[key.value='label']`](
				node: AST.JSONProperty,
			) {
				if (
					node.value.type !== "JSONLiteral"
					|| typeof node.value.value !== "string"
				) return;
				const value = node.value;

				const rawValue = value.raw.slice(1, -1);
				const sentenceCase = toSentenceCase(rawValue);
				if (rawValue === sentenceCase) return;

				context.report({
					loc: node.loc,
					messageId: "must-be-sentence-case",
					data: {
						what: "Parameter descriptions",
					},
					// suggest: [
					// 	{
					// 		messageId: "change-to-fixed",
					// 		data: { fixed },
					fix: (fixer) =>
						fixer.replaceTextRange(
							value.range,
							`"${sentenceCase}"`,
						),
					// 	},
					// ],
					suggest: [
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
			"no-surrounding-whitespace":
				"Leading and trailing whitespace is not allowed",
			"must-be-title-case": "{{what}} must be in Title Case",
			"must-be-sentence-case": "{{what}} must be in Sentence case",
			"change-to-fixed": `Change to "{{fixed}}"`,
			"disable-for-all-options":
				`Disable for all options of this parameter`,
		},
		type: "problem",
	},
};
