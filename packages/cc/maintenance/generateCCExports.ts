/*!
 * This script generates the exports for all utility types from `src/lib/commandclass/*CC.ts`
 */

import {
	formatWithDprint,
	hasComment,
	loadTSConfig,
	projectRoot,
} from "@zwave-js/maintenance";
import { compareStrings } from "@zwave-js/shared";
import esMain from "es-main";
import fs from "node:fs/promises";
import path from "node:path";
import ts from "typescript";

// Define where the CC index file is located
const ccIndexFile = path.join(projectRoot, "src/cc/index.ts");

function hasPublicAPIComment(
	node: ts.Node,
	sourceFile: ts.SourceFile,
): boolean {
	return hasComment(sourceFile, node, (text) => text.includes("@publicAPI"));
}

function findExports() {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig("cc");
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);
	const checker = program.getTypeChecker();

	// Used to remember the exports we found
	const ccExports = new Map<string, { name: string; typeOnly: boolean }[]>();
	function addExport(
		filename: string,
		name: string,
		typeOnly: boolean,
	): void {
		if (!ccExports.has(filename)) ccExports.set(filename, []);
		ccExports.get(filename)!.push({ name, typeOnly });
	}

	function inheritsFromCommandClass(node: ts.ClassDeclaration): boolean {
		let type: ts.InterfaceType | undefined = checker.getTypeAtLocation(
			node,
		) as ts.InterfaceType;
		while (type) {
			if (type.symbol.name === "CommandClass") return true;
			type = checker.getBaseTypes(type)[0] as
				| ts.InterfaceType
				| undefined;
		}
		return false;
	}

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = path
			.relative(projectRoot, sourceFile.fileName)
			.replaceAll("\\", "/");

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

		// Only look at the cc dir
		if (!relativePath.includes("src/cc/")) {
			continue;
		}
		// Ignore test files and the index
		if (
			relativePath.endsWith(".test.ts")
			|| relativePath.endsWith("index.ts")
		) {
			continue;
		}

		// Visit each root node to see if it has a `@publicAPI` comment
		ts.forEachChild(sourceFile, (node) => {
			// Define which declaration types we need to export
			if (
				ts.isEnumDeclaration(node)
				|| ts.isTypeAliasDeclaration(node)
				|| ts.isInterfaceDeclaration(node)
				|| ts.isClassDeclaration(node)
				|| ts.isFunctionDeclaration(node)
				|| ts.isArrowFunction(node)
			) {
				if (!node.name) return;

				// Export all CommandClass implementations
				if (
					ts.isClassDeclaration(node)
					&& node.name.text.includes("CC")
					&& inheritsFromCommandClass(node)
				) {
					addExport(sourceFile.fileName, node.name.text, false);
					return;
				}

				if (!hasPublicAPIComment(node, sourceFile)) return;

				// Make sure we're trying to access a node that is actually exported
				if (
					!node.modifiers?.some(
						(m) => m.kind === ts.SyntaxKind.ExportKeyword,
					)
				) {
					const location = ts.getLineAndCharacterOfPosition(
						sourceFile,
						node.getStart(sourceFile, false),
					);
					throw new Error(
						`${relativePath}:${location.line} Found @publicAPI comment, but the node ${node.name.text} is not exported!`,
					);
				}
				addExport(
					sourceFile.fileName,
					node.name.text,
					ts.isTypeAliasDeclaration(node)
						|| ts.isInterfaceDeclaration(node),
				);
			} else if (
				ts.isExportDeclaration(node)
				&& hasPublicAPIComment(node, sourceFile)
				&& node.exportClause
				&& ts.isNamedExports(node.exportClause)
			) {
				// Also include all re-exports from other locations in the project
				for (const exportSpecifier of node.exportClause.elements) {
					addExport(
						sourceFile.fileName,
						exportSpecifier.name.text,
						node.isTypeOnly || exportSpecifier.isTypeOnly,
					);
				}
			} else if (
				ts.isVariableStatement(node)
				&& node.modifiers?.some(
					(m) => m.kind === ts.SyntaxKind.ExportKeyword,
				)
				// Export consts marked with @publicAPI
				&& (hasPublicAPIComment(node, sourceFile)
					// and the xyzCCValues const
					|| node.declarationList.declarations.some((d) =>
						d.name.getText().endsWith("CCValues")
					))
			) {
				for (const variable of node.declarationList.declarations) {
					if (ts.isIdentifier(variable.name)) {
						addExport(
							sourceFile.fileName,
							variable.name.text,
							false,
						);
					}
				}
			}
		});
	}
	return ccExports;
}

export async function generateCCExports(): Promise<void> {
	let fileContent = `
// This file is auto-generated by maintenance/generateCCExports.ts
// Do not edit it by hand or your changes will be lost!

`;

	// Generate type and value exports for all found symbols
	for (
		const [filename, fileExports] of [...findExports().entries()].sort(
			([fileA], [fileB]) => compareStrings(fileA, fileB),
		)
	) {
		const relativePath = path
			.relative(ccIndexFile, filename)
			// normalize to slashes
			.replaceAll("\\", "/")
			// TS imports may not end with ".ts"
			.replace(/\.ts$/, ".js")
			// By passing the index file as "from", we get an erraneous "../" at the path start
			.replace(/^\.\.\//, "./");
		const typeExports = fileExports.filter((e) => e.typeOnly);
		if (typeExports.length) {
			fileContent += `export type { ${
				typeExports
					.map((e) => e.name)
					.join(", ")
			} } from "${relativePath}"\n`;
		}
		const valueExports = fileExports.filter((e) => !e.typeOnly);
		if (valueExports.length) {
			fileContent += `export { ${
				valueExports
					.map((e) => e.name)
					.join(", ")
			} } from "${relativePath}"\n`;
		}
	}

	// And write the file if it changed
	const originalFileContent = await fs.readFile(ccIndexFile, "utf8").catch(
		() => undefined,
	);
	fileContent = formatWithDprint(ccIndexFile, fileContent);
	if (fileContent !== originalFileContent) {
		console.log("CC index file changed");
		await fs.writeFile(ccIndexFile, fileContent, "utf8");
	}
}

if (esMain(import.meta)) void generateCCExports();
