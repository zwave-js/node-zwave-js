/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import { red } from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";
import ts from "typescript";
import {
	formatWithPrettier,
	loadTSConfig,
	updateModifiers,
} from "../packages/zwave-js/maintenance/tsTools";
import { enumFilesRecursive } from "./tools";

export function findSourceNode(
	program: ts.Program,
	checker: ts.TypeChecker,
	exportingFile: string,
	identifier: string,
): ts.Declaration | undefined {
	// Scan all source files
	const file = program.getSourceFile(exportingFile);
	if (file) {
		const fileSymbol = checker.getSymbolAtLocation(file)!;
		const exportSymbols = checker.getExportsOfModule(fileSymbol);
		const wantedSymbol = exportSymbols.find(
			(e) => e.escapedName === identifier,
		);
		if (wantedSymbol) {
			const node = checker.getAliasedSymbol(wantedSymbol).declarations[0];
			return node;
		}
	}
}

export function getTransformedSource(node: ts.Declaration): string {
	const transformer: ts.TransformerFactory<ts.Node> = (context) => {
		return (root) =>
			ts.visitNode(root, (node) => {
				// Remove exports keyword
				node = updateModifiers(context.factory, node, undefined, [
					ts.SyntaxKind.ExportKeyword,
				]);
				return node;
			});
	};

	const result = ts.transform(node, [transformer]);
	let ret = ts
		.createPrinter()
		.printNode(
			ts.EmitHint.Unspecified,
			result.transformed[0],
			node.getSourceFile(),
		);
	// Format with Prettier so we get the original formatting back
	ret = formatWithPrettier("index.ts", ret).trim();
	return ret;
}

interface ImportRange {
	index: number;
	end: number;
	module: string;
	symbol: string;
}

const importRegex = /<!-- #import (?<symbol>.*?) from "(?<module>.*?)" -->(?:[\s\r\n]*```ts[\r\n]*(?<source>(.|\n)*?)```)?/g;

export function findImportRanges(docFile: string): ImportRange[] {
	const matches = [...docFile.matchAll(importRegex)];
	return matches.map((match) => ({
		index: match.index!,
		// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
		end: match.index! + match[0].length,
		module: match.groups!.module,
		symbol: match.groups!.symbol,
	}));
}

export async function processDocFile(
	program: ts.Program,
	checker: ts.TypeChecker,
	docFile: string,
): Promise<boolean> {
	let fileContent = await fs.readFile(docFile, "utf8");
	const ranges = findImportRanges(fileContent);
	let hasErrors = false;
	// Replace from back to start so we can reuse the indizes
	for (let i = ranges.length - 1; i >= 0; i--) {
		const range = ranges[i];
		const sourceNode = findSourceNode(
			program,
			checker,
			`packages/${range.module}/src/index.ts`,
			range.symbol,
		);
		if (!sourceNode) {
			console.error(
				red(
					`Cannot find symbol ${range.symbol} in module ${range.module}!`,
				),
			);
			hasErrors = true;
		} else {
			const source = getTransformedSource(sourceNode);
			fileContent = `${fileContent.slice(0, range.index)}<!-- #import ${
				range.symbol
			} from "${range.module}" -->

\`\`\`ts
${source}
\`\`\`${fileContent.slice(range.end)}`;
		}
	}
	fileContent = fileContent.replace(/\r\n/g, "\n");
	fileContent = formatWithPrettier(docFile, fileContent);
	if (!hasErrors) {
		await fs.writeFile(docFile, fileContent, "utf8");
	}
	return hasErrors;
}

async function main(): Promise<void> {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig();
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);
	const checker = program.getTypeChecker();

	const files = await enumFilesRecursive(
		path.join(__dirname, "../docs"),
		(f) => f.endsWith(".md"),
	);
	let hasErrors = false;
	for (const file of files) {
		hasErrors ||= await processDocFile(program, checker, file);
	}
	if (hasErrors) {
		process.exit(1);
	}
}

if (!module.parent) {
	void main();
}
