/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import c from "ansi-colors";
import fsp from "node:fs/promises";
import path from "node:path";
import { formatWithDprint } from "../dprint.js";
import { projectRoot } from "../tsAPITools.js";

const docsDir = path.join(projectRoot, "docs");
const examplesDocsDir = path.join(docsDir, "examples");

/** Generates the usage examples, whether the process succeeded */
async function generateExamples(): Promise<boolean> {
	// Load the index file before it gets overwritten
	const indexFilename = path.join(examplesDocsDir, "index.md");
	let indexFileContent = await fsp.readFile(indexFilename, "utf8");
	const indexAutoGenToken = "<!-- AUTO-GENERATE: Examples -->";
	const indexAutoGenStart = indexFileContent.indexOf(indexAutoGenToken);
	if (indexAutoGenStart === -1) {
		console.error(
			c.red(`Marker for auto-generation in examples/index.md missing!`),
		);
		return false;
	}

	// Find examples
	const examples = (await fsp.readdir(examplesDocsDir))
		.filter((f) => f.endsWith(".md") && f !== "index.md");

	const processedExamples: {
		position: number;
		index: string;
		sidebar: string;
	}[] = [];

	let generatedIndex = "";
	let generatedSidebar = "";

	for (const file of examples) {
		const exampleContent = await fsp.readFile(
			path.join(examplesDocsDir, file),
			"utf8",
		);
		const titleMatch = exampleContent.match(
			/^#\s+(.*?)(\s*\{docsify-ignore-all\})?$/m,
		);
		if (!titleMatch) continue;
		const positionMatch = exampleContent.match(
			/<!--\s+POSITION:\s+(\d+)\s+-->/,
		);
		const title = titleMatch[1];
		const position = positionMatch
			? parseInt(positionMatch[1], 10)
			: Number.POSITIVE_INFINITY;

		const filename = file.replace(/\.md$/, "");
		processedExamples.push({
			position,
			index: `\n\n**[${title}](examples/${filename})**`,
			sidebar: `\t- [${title}](examples/${filename})\n`,
		});
	}

	processedExamples.sort((a, b) => a.position - b.position);

	for (const example of processedExamples) {
		generatedIndex += example.index;
		generatedSidebar += example.sidebar;
	}

	// Write the generated index file and sidebar
	indexFileContent = indexFileContent.slice(
		0,
		indexAutoGenStart + indexAutoGenToken.length,
	) + generatedIndex;
	indexFileContent = formatWithDprint("index.md", indexFileContent);
	await fsp.writeFile(indexFilename, indexFileContent, "utf8");

	const sidebarInputFilename = path.join(docsDir, "_sidebar.md");
	let sidebarFileContent = await fsp.readFile(sidebarInputFilename, "utf8");
	const sidebarAutoGenToken = "<!-- AUTO-GENERATE: Examples -->";
	const sidebarAutoGenStart = sidebarFileContent.indexOf(sidebarAutoGenToken);
	if (sidebarAutoGenStart === -1) {
		console.error(
			c.red(`Marker for example auto-generation in _sidebar.md missing!`),
		);
		return false;
	}
	sidebarFileContent = sidebarFileContent.slice(0, sidebarAutoGenStart)
		+ generatedSidebar
		+ sidebarFileContent.slice(
			sidebarAutoGenStart + sidebarAutoGenToken.length,
		);
	sidebarFileContent = formatWithDprint("_sidebar.md", sidebarFileContent);
	await fsp.writeFile(
		path.join(examplesDocsDir, "_sidebar.md"),
		sidebarFileContent,
		"utf8",
	);

	return true;
}

if (!(await generateExamples())) {
	process.exit(1);
}
