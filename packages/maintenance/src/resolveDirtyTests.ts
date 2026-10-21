/*!
 * This scripts ensures that files annotated with @forbiddenImports don't import
 * anything they are not supposed to.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
	type Expression,
	isExportDeclaration,
	isExternalModuleReference,
	isImportDeclaration,
	isImportEqualsDeclaration,
	isNamedExports,
	isNamedImports,
	isNamespaceExport,
	isNamespaceImport,
	isStringLiteral,
	type Node,
	type SourceFile,
	type StringLiteral,
	SyntaxKind,
} from "@typescript/native/ast";
import type { API, Program } from "@typescript/native/sync";
import esMain from "es-main";
import spawn from "nano-spawn";

import { openTSProgram, projectRoot, repoRoot } from "./tsAPITools.js";

const reportFile = path.join(repoRoot, ".tmp", "dirty-tests.json");

function getExternalModuleName(node: Node): Expression | undefined {
	if (
		isImportEqualsDeclaration(node)
		&& isExternalModuleReference(node.moduleReference)
	) {
		return node.moduleReference.expression;
	} else if (isImportDeclaration(node)) {
		// Only return import declarations where there is at least one non-typeonly import specifier
		if (!node.importClause) {
			// import "bar"
			return node.moduleSpecifier;
		} else if (
			node.importClause.phaseModifier !== SyntaxKind.TypeKeyword
			// import foo from "bar"
			&& (!node.importClause.namedBindings
				// import * as foo from "bar"
				|| isNamespaceImport(node.importClause.namedBindings)
				// import {foo, type baz} from "bar"
				|| (isNamedImports(node.importClause.namedBindings)
					&& node.importClause.namedBindings.elements.some(
						(e) => !e.isTypeOnly,
					)))
		) {
			return node.moduleSpecifier;
		}
	} else if (isExportDeclaration(node)) {
		// Only return export declarations where there is at least one non-typeonly export specifier
		if (
			!node.isTypeOnly
			// export * from "bar"
			&& (!node.exportClause
				// export * as foo from "bar"
				|| isNamespaceExport(node.exportClause)
				// export {foo, type baz} from "bar"
				|| (isNamedExports(node.exportClause)
					&& node.exportClause.elements.some((e) => !e.isTypeOnly)))
		) {
			return node.moduleSpecifier;
		}
	}
}

interface LinterContext {
	api: API;
	program: Program;
	sourceFiles: Map<string, SourceFile | undefined>;
	imports: Map<string, string[]>;
	resolvedSourceFiles: Map<string, string>;
}

function getSourceFile(
	context: LinterContext,
	fileName: string,
): SourceFile | undefined {
	if (!context.sourceFiles.has(fileName)) {
		context.sourceFiles.set(
			fileName,
			context.program.getSourceFile(fileName),
		);
	}
	return context.sourceFiles.get(fileName);
}

/** Returns the file names of all modules that are imported with at least one runtime binding */
function getImports(context: LinterContext, sourceFile: SourceFile): string[] {
	const cached = context.imports.get(sourceFile.fileName);
	if (cached) return cached;

	const moduleSpecifiers: StringLiteral[] = [];
	sourceFile.forEachChild((node) => {
		const moduleNameExpr = getExternalModuleName(node);
		// Ignore alias definitions like `import x = y`
		if (moduleNameExpr && isStringLiteral(moduleNameExpr)) {
			moduleSpecifiers.push(moduleNameExpr);
		}
	});

	// Each resolution is a round trip to the compiler process, so resolve all imports of a file at once
	const resolved = moduleSpecifiers.length
		? context.api.batch(
				...moduleSpecifiers.map((specifier) =>
					context.program.getResolvedModuleFromModuleSpecifier.gen(
						specifier,
						sourceFile.fileName,
					),
				),
			)
		: [];
	const output = resolved
		.map((module) => module?.resolvedFileName)
		.filter((fileName) => fileName != undefined);

	context.imports.set(sourceFile.fileName, output);
	return output;
}

/** Given a definition file, this tries to resolve the original source file */
function resolveSourceFileFromDefinition(
	context: LinterContext,
	file: SourceFile,
): string {
	if (context.resolvedSourceFiles.has(file.fileName)) {
		return context.resolvedSourceFiles.get(file.fileName)!;
	}

	function bail() {
		context.resolvedSourceFiles.set(file.fileName, file.fileName);
		return file.fileName;
	}

	const sourceMappingURL = /^\/\/# sourceMappingURL=(.*)$/gm.exec(
		file.text,
	)?.[1];
	if (!sourceMappingURL) return file.fileName;

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
	const originalFile = getSourceFile(context, originalFileName);
	if (originalFile) {
		context.resolvedSourceFiles.set(file.fileName, originalFile.fileName);
		return originalFile.fileName;
	}

	return bail();
}

function relativeToProject(filename: string): string {
	return path.relative(projectRoot, filename).replaceAll("\\", "/");
}

function report(
	diffHash: string,
	changes: Record<string, string[]> | null,
): void {
	fs.mkdirSync(path.dirname(reportFile), { recursive: true });
	fs.writeFileSync(
		reportFile,
		JSON.stringify({ diffHash, changes }, null, 2),
	);
}

function hash(input: string): string {
	const hasher = crypto.createHash("sha256");
	hasher.update(input);
	return hasher.digest("hex");
}

async function getDiffOutput(diffBase?: string): Promise<string> {
	const command = diffBase
		? ["diff", diffBase, "--name-status"]
		: ["status", "--porcelain"];
	const gitDiffOutput = (await spawn("git", command)).stdout;

	return gitDiffOutput
		.split("\n")
		.map((line) => line.trim().split(/\s+/, 2))
		.filter(([mod]) => mod !== "D" /* deleted */)
		.map(([, file]) => file)
		.join("\n");
}

export async function resolveDirtyTests(
	printResult: boolean = true,
	diffBase?: string,
): Promise<void> {
	// Use git to figure out which files have changed
	const gitDiffOutput = await getDiffOutput(diffBase);
	const gitDiffHash = hash(gitDiffOutput);
	const changedFiles = gitDiffOutput
		.split("\n")
		.map((file) => file.trim())
		.filter(Boolean);

	if (!changedFiles) {
		// console.log("No changed files");
		report(gitDiffHash, null);
		return;
	}

	const { api, program } = openTSProgram(undefined, "all");

	const context: LinterContext = {
		api,
		program,
		sourceFiles: new Map(),
		imports: new Map(),
		resolvedSourceFiles: new Map(),
	};

	const dirtySourceFiles = new Set<string>(changedFiles);

	// Scan all source files
	for (const fileName of program.getSourceFileNames()) {
		const relativePath = relativeToProject(fileName);

		// Only look at files inside the packages directory
		if (!relativePath.startsWith("packages/")) continue;
		if (!relativePath.endsWith(".test.ts")) continue;

		const sourceFile = getSourceFile(context, fileName);
		if (!sourceFile) continue;

		// Resolve the import tree
		const visitedSourceFiles = new Set<string>();
		const todo: { file: SourceFile; importStack: string[] }[] = [
			{ file: sourceFile, importStack: [] },
		];
		while (todo.length > 0) {
			const current = todo.shift()!;
			visitedSourceFiles.add(current.file.fileName);
			const importStack = [
				...current.importStack,
				relativeToProject(current.file.fileName),
			];

			// TODO: Try to eliminate barrel files from the dependency tree
			for (const importedFileName of getImports(context, current.file)) {
				if (importedFileName.includes("node_modules")) continue;

				// try to resolve the original source file for declaration files
				let nextFileName = importedFileName;
				if (/\.d\.[cm]?ts$/.test(importedFileName)) {
					const definition = getSourceFile(context, importedFileName);
					if (definition) {
						nextFileName = resolveSourceFileFromDefinition(
							context,
							definition,
						);
					}
				}

				const nextRelativeToProject = relativeToProject(nextFileName);
				if (dirtySourceFiles.has(nextRelativeToProject)) {
					// The file references a changed file, so the entire import stack
					// has to be considered dirty
					for (const file of importStack) {
						dirtySourceFiles.add(file);
					}
				} else if (!visitedSourceFiles.has(nextFileName)) {
					const next = getSourceFile(context, nextFileName);
					if (!next) continue;
					todo.push({
						file: next,
						importStack,
					});
				}
			}
		}
	}

	api.close();

	const dirtyTests = [...dirtySourceFiles].filter((file) =>
		file.endsWith(".test.ts"),
	);

	const testsByPackage: Record<string, string[]> = {};

	for (const file of dirtyTests) {
		const parts = file.split("/");
		const prefix = parts.slice(0, 2).join("/");
		const relativeToPackage = parts.slice(2).join("/");
		if (!testsByPackage[prefix]) {
			testsByPackage[prefix] = [];
		}
		testsByPackage[prefix].push(relativeToPackage);
	}

	if (printResult) console.log(`Found ${dirtyTests.length} dirty tests`);
	report(gitDiffHash, testsByPackage);
}

async function runDirtyTests(diffBase?: string): Promise<void> {
	const gitDiffOutput = await getDiffOutput(diffBase);
	const gitDiffHash = hash(gitDiffOutput);

	let report: { diffHash: string; changes: Record<string, string[]> };
	try {
		report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
	} catch {
		console.error("Dirty tests not resolved yet. Resolve them first with");
		console.error("\nyarn run test:dirty:resolve\n");
		console.error("or pass the --resolve flag.");
		process.exit(1);
	}

	if (report.diffHash !== gitDiffHash) {
		console.error("Dirty tests are out of date. Resolve them first with");
		console.error("\nyarn run test:dirty:resolve\n");
		console.error("or pass the --resolve flag.");
		process.exit(1);
	}

	const projectFolder = path.relative(repoRoot, projectRoot);
	let dirtyTests: string[];
	if (projectFolder) {
		dirtyTests = report.changes[projectFolder];
	} else {
		// When executed in the root dir, run all dirty tests
		dirtyTests = Object.entries(report.changes).flatMap(([folder, tests]) =>
			tests.map((test) => path.join(folder, test)),
		);
	}

	if (!dirtyTests || !dirtyTests.length) {
		console.log(
			`No dirty tests ${projectFolder ? `in ${projectFolder}` : "found"}`,
		);
		return;
	}

	// Run the dirty tests
	console.log(
		`Executing ${dirtyTests.length} dirty tests ${
			projectFolder ? `in ${projectFolder}` : ""
		}...`,
	);
	await spawn("yarn", ["test", ...dirtyTests], {
		stdio: "inherit",
	});
}

if (esMain(import.meta)) {
	const args = process.argv.slice(2);
	const run = args.includes("--run");
	// Resolve dirty tests by default, unless --run is specified
	// In that case, require --resolve to be passed aswell.
	const resolve = !run || args.includes("--resolve");
	const diffBaseArgIndex = args.indexOf("--base");
	let diffBase: string | undefined;
	if (diffBaseArgIndex >= 0 && diffBaseArgIndex < args.length - 1) {
		diffBase = args[diffBaseArgIndex + 1];
	}

	(async () => {
		if (resolve) await resolveDirtyTests(!run, diffBase);
		if (run) await runDirtyTests(diffBase);
	})().catch((e) => {
		console.error(e);
		process.exit(1);
	});
}
