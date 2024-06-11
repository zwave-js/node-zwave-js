// @ts-check
const path = require("path");
const fs = require("fs");

const tsDirectory = path.dirname(require.resolve("typescript"));
const tsLibPath = path.join(tsDirectory, "typescript.js");
let fileContent = fs.readFileSync(tsLibPath, "utf8");

const replacements = [
	[
		// Needed for useful type display when it comes to CC values
		"var defaultMaximumTruncationLength = 160;",
		"var defaultMaximumTruncationLength = 10000;",
	],
];

for (const [search, replace] of replacements) {
	if (!fileContent.includes(search) && !fileContent.includes(replace)) {
		fs.writeFileSync(
			"patch-typescript.log",
			`Failed to patch typescript.js - search string not found:
${search}`,
		);
		console.error(`Failed to patch typescript.js - search string not found:
${search}`);
		process.exit(0);
	}
	fileContent = fileContent.replace(search, replace);
}

fs.writeFileSync(tsLibPath, fileContent);
