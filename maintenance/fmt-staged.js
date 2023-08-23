const fs = require("fs");
const path = require("path");
const { formatWithDprint } = require("@zwave-js/fmt");
const repoRoot = path.join(__dirname, "..");

const files = process.argv.slice(2);

for (const file of files) {
	// Skip package.json and similar
	if (path.basename(file) === "package.json") continue;
	if (path.basename(file) === "package-lock.json") continue;

	console.log(`Formatting ${file}...`);
	const content = fs.readFileSync(file, "utf8");
	const formatted = formatWithDprint(repoRoot, file, content);
	fs.writeFileSync(file, formatted, "utf8");
}
