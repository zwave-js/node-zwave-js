/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import { red } from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";
import ts from "typescript";
import { loadTSConfig } from "../packages/zwave-js/maintenance/tsTools";
import { enumFilesRecursive } from "./tools";

export function findSource(
	program: ts.Program,
	checker: ts.TypeChecker,
	exportingFile: string,
	identifier: string,
): string | undefined {
	// Scan all source files
	const file = program.getSourceFile(exportingFile);
	if (file) {
		const fileSymbol = checker.getSymbolAtLocation(file)!;
		const exportSymbols = checker.getExportsOfModule(fileSymbol);
		const wantedSymbol = exportSymbols.find(
			(e) => e.escapedName === identifier,
		);
		if (wantedSymbol) {
			let code = checker
				.getAliasedSymbol(wantedSymbol)
				.declarations[0].getText();
			// Remove some stuff we don't need
			code = code
				.replace(/^export type/g, "type")
				.replace(/^export interface/g, "interface")
				.replace(/^export class/g, "class")
				.replace(/^export enum/g, "enum");
			return code;
		}
	}
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
		const source = findSource(
			program,
			checker,
			`packages/${range.module}/src/index.ts`,
			range.symbol,
		);
		if (!source) {
			console.error(
				red(
					`Cannot find symbol ${range.symbol} in module ${range.module}!`,
				),
			);
			hasErrors = true;
		} else {
			fileContent = `${fileContent.slice(0, range.index)}<!-- #import ${
				range.symbol
			} from "${range.module}" -->

\`\`\`ts
${source}
\`\`\`${fileContent.slice(range.end)}`;
		}
	}
	fileContent = fileContent.replace(/\r\n/g, "\n");
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
