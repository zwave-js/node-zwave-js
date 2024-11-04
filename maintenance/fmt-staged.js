import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Dprint parallelizes formatting and is generally fast enough to run on the whole repo
// despite lint-staged telling us which files have changed.
const repoRoot = path.join(__dirname, "..");
spawnSync("yarn", ["fmt"], {
	cwd: repoRoot,
});

// If it ever becomes slow, the approach below works:

// const fs = require("fs");
// const { formatWithDprint } = require("@zwave-js/fmt");

// const files = process.argv.slice(2);

// for (const file of files) {
// 	// Skip package.json and similar
// 	if (path.basename(file) === "package.json") continue;
// 	if (path.basename(file) === "package-lock.json") continue;

// 	console.log(`Formatting ${file}...`);
// 	const content = fs.readFileSync(file, "utf8");
// 	const formatted = formatWithDprint(repoRoot, file, content);
// 	fs.writeFileSync(file, formatted, "utf8");
// }
