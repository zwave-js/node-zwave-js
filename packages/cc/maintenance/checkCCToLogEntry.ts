/*!
 * This scripts checks which CCs have `toLogEntry` implemented
 */

import { loadTSConfig, projectRoot } from "@zwave-js/maintenance";
import * as path from "path";
import ts from "typescript";

export function checkCCToLogEntry(): void {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig("cc");
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

	const results = new Map<
		string,
		boolean | "empty" | "constructor" | "ignored"
	>();

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = path
			.relative(projectRoot, sourceFile.fileName)
			.replace(/\\/g, "/");

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

		// Only look at the cc dir
		if (!relativePath.includes("/src/cc/")) {
			continue;
		}
		// Ignore test files and the index
		if (
			relativePath.endsWith(".test.ts")
			|| relativePath.endsWith("index.ts")
		) {
			continue;
		}

		// Visit each CC class and see if it overwrites determineRequiredCCInterviews
		ts.forEachChild(sourceFile, (node) => {
			// Only look at class declarations that have "CC" in the name, don't end with "CC" or "API"
			if (
				ts.isClassDeclaration(node)
				&& node.name
				&& node.name.text.includes("CC")
				&& !node.name.text.endsWith("CC")
				&& !node.name.text.startsWith("ZWaveProtocol")
				&& !node.name.text.endsWith("API")
			) {
				// Only look at implementations of toLogEntry
				if (node.members.length === 0) {
					// ignore empty classes
					results.set(node.name.text, "empty");
				} else if (
					node.members.length === 1
					&& node.members[0].kind === ts.SyntaxKind.Constructor
				) {
					// TODO: move this check into lintCCConstructor
					// highlight constructor only
					results.set(node.name.text, "constructor");
				} else if (
					node.getText(sourceFile).includes("// @noLogEntry")
				) {
					// Check disabled with a `// @noLogEntry` comment in the class body
					results.set(node.name.text, "ignored");
				} else {
					const hasToLogEntry = node.members.some(
						(member) =>
							ts.isMethodDeclaration(member)
							&& member.name.getText(sourceFile) === "toLogEntry",
					);
					results.set(node.name.text, hasToLogEntry);
				}
			}
		});
	}

	const sortedCCs = [...results.keys()].sort();
	for (const cc of sortedCCs) {
		const checkResult = results.get(cc)!;
		console.error(
			`- [${checkResult !== false ? "x" : " "}] ${cc}${
				checkResult === "empty"
					? " _(empty CC)_"
					: checkResult === "constructor"
					? " **(constructor only)**"
					: checkResult === "ignored"
					? " _(ignored with comment)_"
					: ""
			}`,
		);
	}

	if ([...results.values()].every((v) => v !== false)) {
		console.error();
		console.error("All CCs have a toLogEntry implementation :)");
	}
}

if (require.main === module) {
	checkCCToLogEntry();
	process.exit(0);
}
