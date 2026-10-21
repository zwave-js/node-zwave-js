/*!
 * This scripts checks which CCs have `toLogEntry` implemented
 */

import * as path from "node:path";

import {
	isClassDeclaration,
	isMethodDeclaration,
	SyntaxKind,
} from "@typescript/native/ast";
import { openTSProgram, projectRoot } from "@zwave-js/maintenance";
import esMain from "es-main";

export function checkCCToLogEntry(): void {
	const { api, program } = openTSProgram("cc", "");

	const results = new Map<
		string,
		boolean | "empty" | "constructor" | "ignored"
	>();

	// Scan all source files
	for (const fileName of program.getSourceFileNames()) {
		const relativePath = path
			.relative(projectRoot, fileName)
			.replaceAll("\\", "/");

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

		const sourceFile = program.getSourceFile(fileName);
		if (!sourceFile) continue;

		// Visit each CC class and see if it overwrites determineRequiredCCInterviews
		sourceFile.forEachChild((node) => {
			// Only look at class declarations that have "CC" in the name, don't end with "CC" or "API"
			if (
				isClassDeclaration(node)
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
					&& node.members[0].kind === SyntaxKind.Constructor
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
							isMethodDeclaration(member)
							&& member.name.getText(sourceFile) === "toLogEntry",
					);
					results.set(node.name.text, hasToLogEntry);
				}
			}
		});
	}

	api.close();

	const sortedCCs = [...results.keys()].toSorted();
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

if (esMain(import.meta)) {
	checkCCToLogEntry();
	process.exit(0);
}
