import * as prettier from "prettier";

// Make the linter happy
export function formatWithPrettier(
	filename: string,
	sourceText: string,
): string {
	const prettierOptions = {
		...require("../../../.prettierrc"),
		// To infer the correct parser
		filepath: filename,
	};
	return prettier.format(sourceText, prettierOptions);
}
