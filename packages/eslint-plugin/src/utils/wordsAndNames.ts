export function combinations(...fragments: string[][]): string[] {
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
		"Window Covering",
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

export const fixedMultiWordNames = [
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
export const fixedNames = [
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

export const wordSeparators = new Set([
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

export interface Word {
	word: string;
	suffix: string;
}

export function joinWords(words: Word[]): string {
	return words.map((w) => w.word + w.suffix).join("");
}

export const splitIntoWordsCache = new Map<string, Word[]>();

export function splitIntoWords(str: string): Word[] {
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

export function isEndOfSentence(suffix: string, strict: boolean): boolean {
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

export function isHyphenatedWord(str: string): boolean {
	return str.includes("-");
}

export function isCombinedWord(str: string): boolean {
	return str.includes("/");
}
