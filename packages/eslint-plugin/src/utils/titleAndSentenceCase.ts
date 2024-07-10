import {
	fixedNames,
	isCombinedWord,
	isEndOfSentence,
	isHyphenatedWord,
	joinWords,
	splitIntoWords,
} from "./wordsAndNames";

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

export function toTitleCase(str: string, allowFinalSuffix = true): string {
	const cacheKey = `finalSuffix:${allowFinalSuffix}::${str}`;
	if (titleCaseCache.has(cacheKey)) return titleCaseCache.get(cacheKey)!;

	let words = splitIntoWords(str);

	words = words
		// Disallow punctuation before the first word
		.filter(({ word }, i) => i > 0 || word.length > 0)
		// Forbid "The" at the start of titles
		.filter(({ word }, i) => i > 0 || word.toLowerCase() !== "the");

	const titleCased = words
		.map(({ word, suffix }, i, words) => {
			const isFirstWord = i === 0
				|| isEndOfSentence(words[i - 1].suffix, false);

			let fixedSuffix = suffix;
			if (!allowFinalSuffix && i === words.length - 1) {
				// When allowFinalSuffix is false, the last word may not have any suffix, except ")"
				fixedSuffix = suffix.includes(")") ? ")" : "";
			}
			return {
				word: titleCaseWord(word, isFirstWord),
				suffix: fixedSuffix,
			};
		});
	const ret = joinWords(titleCased);
	titleCaseCache.set(cacheKey, ret);
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
		if (exception) return exception;
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

export function toSentenceCase(str: string, allowFinalSuffix = true): string {
	const cacheKey = `finalSuffix:${allowFinalSuffix}::${str}`;
	if (sentenceCaseCache.has(cacheKey)) {
		return sentenceCaseCache.get(cacheKey)!;
	}

	let words = splitIntoWords(str);

	words = words
		// Disallow punctuation before the first word
		.filter(({ word }, i) => i > 0 || word.length > 0);

	const sentenceCased = words
		.map(({ word, suffix }, i, words) => {
			const isFirstWord = i === 0
				|| isEndOfSentence(words[i - 1].suffix, false);
			let fixedSuffix = suffix;
			if (!allowFinalSuffix && i === words.length - 1) {
				// When allowFinalSuffix is false, the last word may not have any suffix, except ")"
				fixedSuffix = suffix.includes(")") ? ")" : "";
			}
			return {
				word: sentenceCaseWord(word, isFirstWord),
				suffix: fixedSuffix,
			};
		});
	const ret = joinWords(sentenceCased);
	sentenceCaseCache.set(cacheKey, ret);
	return ret;
}
