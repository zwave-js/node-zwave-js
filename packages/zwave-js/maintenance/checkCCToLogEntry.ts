/*!
 * This scripts checks which CCs have `toLogEntry` implemented
 */

import * as path from "path";
import ts from "typescript";
import { loadTSConfig, projectRoot } from "./tsTools";

export function checkCCToLogEntry(): void {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig();
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

	const results = new Map<string, boolean>();

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = path
			.relative(projectRoot, sourceFile.fileName)
			.replace(/\\/g, "/");

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

		// Only look at the commandclass dir
		if (!relativePath.includes("/commandclass/")) {
			continue;
		}
		// Ignore test files and the index
		if (
			relativePath.endsWith(".test.ts") ||
			relativePath.endsWith("index.ts")
		) {
			continue;
		}

		// Visit each CC class and see if it overwrites determineRequiredCCInterviews
		ts.forEachChild(sourceFile, (node) => {
			// Only look at class declarations that have "CC" in the name, don't end with "CC" or "API"
			if (
				ts.isClassDeclaration(node) &&
				node.name &&
				node.name.text.includes("CC") &&
				!node.name.text.endsWith("CC") &&
				!node.name.text.endsWith("API")
			) {
				// Only look at implementations of toLogEntry
				const hasToLogEntry = node.members.some(
					(member) =>
						ts.isMethodDeclaration(member) &&
						member.name.getText(sourceFile) === "toLogEntry",
				);
				results.set(node.name.text, hasToLogEntry);
			}
		});
	}

	const sortedCCs = [...results.keys()].sort();
	for (const cc of sortedCCs) {
		const has = results.get(cc)!;
		console.error(`- [${has ? "x" : " "}] ${cc}`);
	}
}

if (!module.parent) {
	checkCCToLogEntry();
	process.exit(0);
}
