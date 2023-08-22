/*!
 * This scripts ensures that files annotated with @forbiddenImports don't import
 * anything they are not supposed to.
 */

import { bold, red } from "ansi-colors";
import fs from "fs";
import path from "path";
import ts from "typescript";
import { reportProblem } from "./reportProblem";
import { loadTSConfig, projectRoot } from "./tsAPITools";

// Whitelist some imports that are known not to import forbidden modules
const whitelistedImports = [
	"reflect-metadata",
	"alcalzone-shared/arrays",
	"alcalzone-shared/async",
	"alcalzone-shared/comparable",
	"alcalzone-shared/deferred-promise",
	"alcalzone-shared/math",
	"alcalzone-shared/objects",
	"alcalzone-shared/sorted-list",
	"alcalzone-shared/strings",
	"alcalzone-shared/typeguards",
];

// Whitelist some more imports that should be ignored in the checking
const ignoredImports = ["@zwave-js/transformers"];

function getExternalModuleName(node: ts.Node): ts.Expression | undefined {
	if (
		ts.isImportEqualsDeclaration(node)
		&& ts.isExternalModuleReference(node.moduleReference)
	) {
		return node.moduleReference.expression;
	} else if (ts.isImportDeclaration(node)) {
		// Only return import declarations where there is at least one non-typeonly import specifier
		if (!node.importClause) {
			// import "bar"
			return node.moduleSpecifier;
		} else if (
			!node.importClause.isTypeOnly
			// import foo from "bar"
			&& (!node.importClause.namedBindings
				// import * as foo from "bar"
				|| ts.isNamespaceImport(node.importClause.namedBindings)
				// import {foo, type baz} from "bar"
				|| (ts.isNamedImports(node.importClause.namedBindings)
					&& node.importClause.namedBindings.elements.some(
						(e) => !e.isTypeOnly,
					)))
		) {
			return node.moduleSpecifier;
		}
	} else if (ts.isExportDeclaration(node)) {
		// Only return export declarations where there is at least one non-typeonly export specifier
		if (
			!node.isTypeOnly
			// export * from "bar"
			&& (!node.exportClause
				// export * as foo from "bar"
				|| ts.isNamespaceExport(node.exportClause)
				// export {foo, type baz} from "bar"
				|| (ts.isNamedExports(node.exportClause)
					&& node.exportClause.elements.some((e) => !e.isTypeOnly)))
		) {
			return node.moduleSpecifier;
		}
	}
}

interface ResolvedImport {
	name: string;
	line: number;
	sourceFile: ts.SourceFile;
}

function getImports(
	sourceFile: ts.SourceFile,
	checker: ts.TypeChecker,
): ResolvedImport[] {
	const output: ResolvedImport[] = [];
	ts.forEachChild(sourceFile, (node) => {
		// Vist top-level import nodes
		const moduleNameExpr = getExternalModuleName(node);
		// if they have a name, that is a string, i.e. not alias definition `import x = y`
		if (
			moduleNameExpr
			&& moduleNameExpr.kind === ts.SyntaxKind.StringLiteral
		) {
			// Ask the checker about the "symbol: for this module name
			// it would be undefined if the module was not found (i.e. error)
			const moduleSymbol = checker.getSymbolAtLocation(moduleNameExpr);
			const file = moduleSymbol?.getDeclarations()?.[0]?.getSourceFile();
			if (file) {
				output.push({
					name: moduleNameExpr.getText(sourceFile),
					line: ts.getLineAndCharacterOfPosition(
						sourceFile,
						moduleNameExpr.getStart(),
					).line + 1,
					sourceFile: file,
				});
			}
		}
	});
	return output;
}

interface LinterContext {
	program: ts.Program;
	resolvedSourceFiles: Map<string, string>;
}

/** Given a definition file, this tries to resolve the original source file */
function resolveSourceFileFromDefinition(
	context: LinterContext,
	file: ts.SourceFile,
): ts.SourceFile {
	if (context.resolvedSourceFiles.has(file.fileName)) {
		return (
			context.program.getSourceFile(
				context.resolvedSourceFiles.get(file.fileName)!,
			) ?? file
		);
	}

	function bail() {
		context.resolvedSourceFiles.set(file.fileName, file.fileName);
		return file;
	}

	const sourceMappingURL = /^\/\/# sourceMappingURL=(.*)$/gm.exec(
		file.text,
	)?.[1];
	if (!sourceMappingURL) return file;

	const mapPath = path.resolve(path.dirname(file.fileName), sourceMappingURL);
	let map: any;
	try {
		map = JSON.parse(fs.readFileSync(mapPath, "utf8"));
	} catch {
		return bail();
	}

	let originalFileName = map.sources?.[0];
	if (typeof originalFileName !== "string") {
		return bail();
	}

	originalFileName = path.resolve(
		path.dirname(file.fileName),
		originalFileName,
	);
	const originalFile = context.program.getSourceFile(originalFileName);
	if (originalFile) {
		context.resolvedSourceFiles.set(file.fileName, originalFile.fileName);
		return originalFile;
	}

	return bail();
}

function relativeToProject(filename: string): string {
	return path.relative(projectRoot, filename).replace(/\\/g, "/");
}

const forbiddenImportsRegex =
	/^\/\* @forbiddenImports (?<forbidden>.*?) \*\/$/gm;

export function lintForbiddenImports(): Promise<void> {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig(undefined, false);
	const program = ts.createProgram(tsConfig.fileNames, {
		...tsConfig.options,
		preserveSymlinks: false,
	});
	const checker = program.getTypeChecker();

	const context: LinterContext = {
		program,
		resolvedSourceFiles: new Map(),
	};

	let numErrors = 0;

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = relativeToProject(sourceFile.fileName);

		// Only look at files inside the packages directory
		if (!relativePath.startsWith("packages/")) continue;

		// And only those with at least one @forbiddenImports comment
		const forbidden = [...sourceFile.text.matchAll(forbiddenImportsRegex)]
			.map((match) => match.groups?.forbidden?.trim())
			.filter((forbidden): forbidden is string => !!forbidden)
			.flatMap((forbidden) => forbidden.split(" "));
		if (!forbidden.length) continue;

		function checkImport(
			imp: ResolvedImport,
		): "ignored" | "forbidden" | "ok" {
			const trimmedImport = imp.name.replace(/"/g, "");
			if (ignoredImports.includes(trimmedImport)) return "ignored";

			if (forbidden.includes("external")) {
				// The special import name "external" forbids all external imports
				// from outside the monorepo except whitelisted ones

				if (
					imp.sourceFile.fileName.includes("node_modules")
					&& !whitelistedImports.includes(trimmedImport)
				) {
					return "forbidden";
				}
			}

			return forbidden.includes(trimmedImport) ? "forbidden" : "ok";
		}

		// Resolve the import tree
		const visitedSourceFiles = new Set<string>();
		const todo: { file: ts.SourceFile; importStack: string[] }[] = [
			{ file: sourceFile, importStack: [] },
		];
		while (todo.length > 0) {
			const current = todo.shift()!;
			visitedSourceFiles.add(current.file.fileName);
			const importStack = [
				...current.importStack,
				relativeToProject(current.file.fileName),
			];

			const imports = getImports(current.file, checker);
			for (const imp of imports) {
				switch (checkImport(imp)) {
					case "ignored":
						continue;

					case "forbidden": {
						numErrors++;

						const message =
							`Found forbidden import of module ${imp.name}:
${
								[...importStack, `❌ ${imp.name}`]
									.map((file, indent) =>
										indent === 0
											? file
											: `${
												"   ".repeat(indent - 1)
											}└─ ${file}`
									)
									.join("\n")
							}`;

						reportProblem({
							severity: "error",
							// The line number is relative to the declaration file, so we cannot resolve it to the .ts file here
							filename: path
								.relative(projectRoot, current.file.fileName)
								.replace(/\\/g, "/"),
							line: imp.line,
							message: message,
						});
						break;
					}
					case "ok": {
						// try to resolve the original source file for declaration files
						const next: ts.SourceFile = imp.sourceFile
								.isDeclarationFile
							? resolveSourceFileFromDefinition(
								context,
								imp.sourceFile,
							)
							: imp.sourceFile;

						if (!visitedSourceFiles.has(next.fileName)) {
							todo.push({
								file: next,
								importStack,
							});
						}
					}
				}
			}
		}
	}

	if (numErrors) {
		console.error();
		console.error(
			red(
				`Found ${bold(numErrors.toString())} error${
					numErrors !== 1 ? "s" : ""
				}!`,
			),
		);
		return Promise.reject(
			new Error(
				"The forbiddenImports rule had an error! See log output for details.",
			),
		);
	} else {
		return Promise.resolve();
	}
}

if (require.main === module) {
	lintForbiddenImports()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
}
