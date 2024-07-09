import { ESLintUtils, type TSESTree } from "@typescript-eslint/utils";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { type Rule } from "../utils.js";

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

function resolveImport(
	node: ts.Node,
	checker: ts.TypeChecker,
): ResolvedImport | undefined {
	const sourceFile = node.getSourceFile();

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
			return {
				name: moduleNameExpr.getText(sourceFile),
				line: ts.getLineAndCharacterOfPosition(
					sourceFile,
					moduleNameExpr.getStart(),
				).line + 1,
				sourceFile: file,
			};
		}
	}
}

interface ResolverContext {
	program: ts.Program;
	resolvedSourceFiles: Map<string, string>;
}

/** Given a definition file, this tries to resolve the original source file */
function resolveSourceFileFromDefinition(
	context: ResolverContext,
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

const forbiddenImportsRegex = /^@forbiddenImports (?<forbidden>.*?)$/;

export const noForbiddenImports: Rule = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		// And only those with at least one /* @forbiddenImports ... */ comment
		const comments = context.sourceCode.getAllComments()
			.filter((c) => c.type === "Block")
			.map((c) => c.value.trim());
		const forbidden = comments.map((c) => c.match(forbiddenImportsRegex))
			.filter((match) => !!match)
			.map((match) => match.groups?.forbidden?.trim())
			.filter((forbidden): forbidden is string => !!forbidden)
			.flatMap((forbidden) => forbidden.split(" "));

		// No comments, nothing to do
		if (!forbidden.length) return {};

		const services = ESLintUtils.getParserServices(context);
		const checker = services.program.getTypeChecker();
		const projectRoot = services.program.getCurrentDirectory();

		function relativeToProject(filename: string): string {
			return path.relative(projectRoot, filename).replaceAll(
				/[\\\/]/g,
				path.sep,
			);
		}

		// Remember which source files we have already visited
		const visitedSourceFiles = new Set<string>(context.filename);
		let todo: { file: ts.SourceFile; importStack: string[] }[] = [];
		const resolverContext: ResolverContext = {
			program: services.program,
			resolvedSourceFiles: new Map(),
		};

		function addTodo(imp: ResolvedImport, importStack: string[]) {
			// try to resolve the original source file for declaration files
			const next: ts.SourceFile = imp.sourceFile
					.isDeclarationFile
				? resolveSourceFileFromDefinition(
					resolverContext,
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

		function reportForbiddenImport(
			node: TSESTree.Node,
			imp: ResolvedImport,
			importStack: string[],
		) {
			if (importStack.length === 0) {
				context.report({
					loc: node.loc,
					messageId: "forbidden-import",
					data: {
						name: imp.name,
					},
				});
			} else {
				context.report({
					loc: node.loc,
					messageId: "forbidden-import-transitive",
					data: {
						name: imp.name,
						stack: [
							...importStack,
							`❌ ${imp.name}`,
						]
							.map((file, indent) =>
								indent === 0
									? file
									: `${"   ".repeat(indent - 1)}└─ ${file}`
							)
							.map((line) => `\n${line}`)
							.join(""),
					},
				});
			}
		}

		function checkImport(
			imp: ResolvedImport,
		): "ignored" | "forbidden" | "ok" {
			const trimmedImport = imp.name.replaceAll("\"", "");
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

		return {
			"ImportDeclaration,ExportNamedDeclaration,ExportAllDeclaration"(
				node:
					| TSESTree.ImportDeclaration
					| TSESTree.ExportAllDeclaration
					| TSESTree.ExportNamedDeclaration,
			) {
				const tsNode = services.esTreeNodeToTSNodeMap.get(node);
				const resolvedImport = resolveImport(tsNode, checker);
				if (!resolvedImport) return;

				// First test the import itself
				switch (checkImport(resolvedImport)) {
					case "forbidden": {
						reportForbiddenImport(node, resolvedImport, []);
						// No need to report 200 errors on a single import
						return;
					}
					case "ok": {
						// Import is okay, add it to the TODO list
						addTodo(resolvedImport, []);
					}
				}

				// Continue resolving the import tree until it is empty
				todo: while (todo.length > 0) {
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
								reportForbiddenImport(node, imp, importStack);
								// No need to report 200 errors on a single import
								break todo;
							}
							case "ok": {
								addTodo(imp, importStack);
							}
						}
					}
				}

				todo = [];
			},
		};
	},
	meta: {
		docs: {
			description:
				"Ensures that certain files or modules are not transitively imported",
		},
		type: "problem",
		schema: [],
		messages: {
			"forbidden-import-transitive":
				"This import transitively imports forbidden import {{name}}:\nImport stack:{{stack}}",
			"forbidden-import": "Found forbidden import of module {{name}}",
		},
	},
	defaultOptions: [],
});
