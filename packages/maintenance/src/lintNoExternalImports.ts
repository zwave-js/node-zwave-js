/*!
 * This scripts ensures that files annotated with @noExternalImports don't import
 * anything from outside the monorepo.
 */

import * as path from "path";
import ts from "typescript";
import { reportProblem } from "./reportProblem";
import { loadTSConfig, projectRoot } from "./tsAPITools";

function getExternalModuleName(node: ts.Node): ts.Expression | undefined {
	if (
		ts.isImportEqualsDeclaration(node) &&
		ts.isExternalModuleReference(node.moduleReference)
	) {
		return node.moduleReference.expression;
	} else if (ts.isImportDeclaration(node)) {
		// Only return import declarations where there is at least one non-typeonly import specifier
		if (
			node.importClause &&
			!node.importClause.isTypeOnly &&
			(!node.importClause.namedBindings ||
				(ts.isNamedImports(node.importClause.namedBindings) &&
					node.importClause.namedBindings.elements.some(
						(e) => !e.isTypeOnly,
					)))
		) {
			return node.moduleSpecifier;
		}
	} else if (ts.isExportDeclaration(node)) {
		// Only return export declarations where there is at least one non-typeonly export specifier
		if (
			!node.isTypeOnly &&
			(!node.exportClause ||
				(ts.isNamedExports(node.exportClause) &&
					node.exportClause.elements.some((e) => !e.isTypeOnly)))
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
		// if they have a name, that is a string, i.e. not alias defition `import x = y`
		if (
			moduleNameExpr &&
			moduleNameExpr.kind === ts.SyntaxKind.StringLiteral
		) {
			// Ask the checker about the "symbol: for this module name
			// it would be undefined if the module was not found (i.e. error)
			const moduleSymbol = checker.getSymbolAtLocation(moduleNameExpr);
			const file = moduleSymbol?.getDeclarations()?.[0]?.getSourceFile();
			if (file) {
				output.push({
					name: moduleNameExpr.getText(sourceFile),
					line:
						ts.getLineAndCharacterOfPosition(
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

function dtsToTs(filename: string): string {
	return filename.replace(/\/build\/(.*?)\.d\.ts$/, "/src/$1.ts");
}

function relativeToProject(filename: string): string {
	return path.relative(projectRoot, filename).replace(/\\/g, "/");
}

export function lintNoExternalImports(): Promise<void> {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig("zwave-js");
	const program = ts.createProgram(tsConfig.fileNames, {
		...tsConfig.options,
		preserveSymlinks: false,
	});
	const checker = program.getTypeChecker();

	let hasError = false;

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = relativeToProject(sourceFile.fileName);

		// Only look at files inside the packages directory
		if (!relativePath.startsWith("packages/")) continue;

		// And only those with a @noExternalImports comment
		if (!sourceFile.text.includes("/* @noExternalImports */")) continue;

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
				dtsToTs(relativeToProject(current.file.fileName)),
			];

			const imports = getImports(current.file, checker);
			for (const imp of imports) {
				if (imp.sourceFile.fileName.includes("node_modules")) {
					hasError = true;

					const message = `Found forbidden import of external module ${
						imp.name
					}:
${[...importStack, `❌ ${imp.name}`]
	.map((file, indent) =>
		indent === 0 ? file : `${"   ".repeat(indent - 1)}└─ ${file}`,
	)
	.join("\n")}`;

					reportProblem({
						severity: "error",
						// The line number is relative to the declaration file, so we cannot resolve it to the .ts file here
						filename: path
							.relative(projectRoot, current.file.fileName)
							.replace(/\\/g, "/"),
						line: imp.line,
						message: message,
					});
				}

				if (!visitedSourceFiles.has(imp.sourceFile.fileName)) {
					todo.push({
						file: imp.sourceFile,
						importStack,
					});
				}
			}
		}
	}

	if (hasError) {
		return Promise.reject(
			new Error(
				"The noExternalImports rule had an error! See log output for details.",
			),
		);
	} else {
		return Promise.resolve();
	}
}

if (require.main === module) {
	lintNoExternalImports()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
}
