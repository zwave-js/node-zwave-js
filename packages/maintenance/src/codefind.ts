/*!
 * This scripts helps find certain code patterns via the CLI
 */

import {
	blueBright,
	bold,
	gray,
	greenBright,
	redBright,
	yellow,
} from "ansi-colors";
import highlight, { fromJson as themeFromJson } from "cli-highlight";
import globrex from "globrex";
import path from "node:path";
import ts from "typescript";
import yargs from "yargs";
import { loadTSConfig, projectRoot } from "./tsAPITools";

function relativeToProject(filename: string): string {
	return path.relative(projectRoot, filename).replaceAll("\\", "/");
}

export interface CodeFindQuery {
	filePatterns?: string[];
	excludeFilePatterns?: string[];
	codePatterns?: string[];
	excludeCodePatterns?: string[];
	search: RegExp | string;
	options?: Partial<{
		additionalLines: number;
	}>;
}

export interface Result {
	file: string;
	line: number;
	character: number;
	codePath: string;
	formatted: string;
	match: string;
}

const highlightTheme = themeFromJson({
	keyword: "blue",
	// function: ["yellow", "dim"],
	built_in: ["cyan", "dim"],
	string: "red",
	type: ["cyan"],
	comment: ["green", "dim"],
	class: ["green"],
	// default: "gray",
});

function formatResult(
	sourceFile: ts.SourceFile,
	result: Omit<Result, "formatted">,
	additionalLines: number = 3,
): Result {
	const ret: Result = {
		...result,
		formatted: "",
	};

	let source = sourceFile.text;
	// Remember the leading tabs for each line
	const leadingTabs = source
		.split("\n")
		.map((line) => line.match(/^\t*/)?.[0]?.length ?? 0);
	// Then replace them with 4 spaces for formatting
	source = source
		.split("\n")
		.map((line, i) => line.replace(/^\t*/, "    ".repeat(leadingTabs[i])))
		.join("\n");

	let formattedSourceLines = highlight(source, {
		language: "typescript",
		theme: highlightTheme,
	}).split("\n");
	const lineIndicatorLength = Math.ceil(
		Math.log10(formattedSourceLines.length),
	);

	formattedSourceLines = formattedSourceLines.map((line, i) => {
		let ret = line;
		if (i === result.line) ret = bold(ret);
		const prefix = `${i + 1}`.padStart(lineIndicatorLength);
		if (i === result.line) {
			ret = `${bold(greenBright(prefix))} | ${ret}`;
			ret += "\n"
				+ " ".repeat(prefix.length)
				+ " | "
				// Leading tabs are counted as a single character by TS, but we want to
				// display them as 4 spaces. This means we need to offset the column number
				// by 3 times the no. of tabs.
				+ " ".repeat(3 * leadingTabs[i] + result.character)
				+ bold(greenBright("^".repeat(result.match.length)));
		} else {
			ret = `${gray(prefix)} | ${ret}`;
		}
		return ret;
	});

	const startLine = Math.max(0, result.line - additionalLines);
	const endLine = Math.min(
		formattedSourceLines.length,
		result.line + 1 + additionalLines,
	);
	ret.formatted = formattedSourceLines.slice(startLine, endLine).join("\n");

	return ret;
}

function getNodeName(
	sourceFile: ts.SourceFile,
	node: ts.Node,
): string | undefined {
	if (
		ts.isVariableDeclaration(node)
		&& ts.isIdentifier(node.name)
		&& node.initializer
		&& (ts.isArrowFunction(node.initializer)
			|| ts.isFunctionExpression(node.initializer)
			|| ts.isClassExpression(node.initializer))
		&& !node.initializer.name
	) {
		// const foo = function() { ... }
		// const foo = () => { ... }
		// const foo = class { ... }
		return node.name?.getText(sourceFile);
	} else if (
		(ts.isFunctionDeclaration(node)
			|| ts.isFunctionExpression(node)
			|| ts.isMethodDeclaration(node)
			|| ts.isClassDeclaration(node))
		&& node.name
	) {
		// function foo() { ... }
		// class foo { ... } (or its methods)
		return node.name.getText(sourceFile);
	} else if (
		ts.isCallExpression(node)
		&& ts.isIdentifier(node.expression)
		&& node.arguments.some(
			(arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
		)
	) {
		// Call expressions where at least one of the arguments is a function
		// beforeAll(() => { ... })
		return node.expression.text;
	} else if (ts.isConstructorDeclaration(node)) {
		// class Foo { constructor() { ... } }
		return "constructor";
	}
}

function getCodePathAtPosition(
	sourceFile: ts.SourceFile,
	position: number,
	separator: string = "/",
): string {
	function visit(node: ts.Node, path: string[]) {
		const start = node.getStart(sourceFile);
		if (start > position) return;
		const end = node.getEnd();
		if (end < position) return;

		// The position is somewhere inside this node, recurse!
		const nodeName = getNodeName(sourceFile, node);
		if (nodeName) path.push(nodeName);
		ts.forEachChild(node, (member) => visit(member, path));
	}

	const path: string[] = [];
	ts.forEachChild(sourceFile, (node) => visit(node, path));
	return path.join(separator);
}

export function codefind(query: CodeFindQuery): Result[] {
	const tsConfig = loadTSConfig("zwave-js", false);
	const program = ts.createProgram(tsConfig.fileNames, {
		...tsConfig.options,
		preserveSymlinks: false,
	});
	// const checker = program.getTypeChecker();

	const results: Result[] = [];

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = relativeToProject(sourceFile.fileName);

		const relativePathMatchesPattern = (pattern: string) => {
			const { regex } = globrex(pattern, { extended: true });
			return regex.test(relativePath);
		};

		// If an include pattern is given, make sure the relative path matches at least one
		if (
			query.filePatterns
			&& !query.filePatterns.some((pattern) =>
				relativePathMatchesPattern(pattern)
			)
		) {
			continue;
		}
		// If an exclude pattern is given, make sure the relative path matches none
		if (
			query.excludeFilePatterns
			&& query.excludeFilePatterns.some((pattern) =>
				relativePathMatchesPattern(pattern)
			)
		) {
			continue;
		}

		let codePatterns: RegExp[] | undefined;
		if (query.codePatterns) {
			codePatterns = query.codePatterns.map(
				(pattern) =>
					globrex(pattern, {
						extended: true,
					}).regex,
			);
		}
		let excludeCodePatterns: RegExp[] | undefined;
		if (query.excludeCodePatterns) {
			excludeCodePatterns = query.excludeCodePatterns.map(
				(pattern) =>
					globrex(pattern, {
						extended: true,
					}).regex,
			);
		}

		const searchNodes: [path: string, node: ts.Node][] = [];
		if (codePatterns || excludeCodePatterns) {
			const pathMatches = (path: string[]): boolean | "unknown" => {
				const fullPath = path.join("/");
				if (
					excludeCodePatterns?.some((pattern) =>
						pattern.test(fullPath)
					)
				) {
					// This code pattern is excluded
					return false;
				} else if (
					codePatterns?.some((pattern) => pattern.test(fullPath))
				) {
					// This code pattern is included
					return true;
				} else {
					return "unknown";
				}
			};

			function visit(node: ts.Node, path: string[]) {
				const nodeName = getNodeName(sourceFile, node);
				if (nodeName) {
					// This node has a name, check if it is a match
					const newPath = [...path, nodeName];
					const match = pathMatches(newPath);
					if (match === false) {
						// This node is excluded, do not look further
						return;
					} else if (match === true) {
						// This node is of interest
						searchNodes.push([newPath.join("/"), node]);
					} else {
						// no match, but new path segment to remember
						// Iterate through children
						ts.forEachChild(
							node,
							(member) => visit(member, newPath),
						);
					}
				} else {
					// No name, iterate through children with the same name
					ts.forEachChild(node, (member) => visit(member, path));
				}
			}

			ts.forEachChild(sourceFile, (node) => visit(node, []));
		} else {
			// Simply look at the entire source file
			searchNodes.push(["/", sourceFile]);
		}

		for (const [, node] of searchNodes) {
			const text = node.getText(sourceFile);
			if (typeof query.search === "string") {
				// Find all occurrences of simple strings in the node
				let startIndex = 0;
				let foundIndex = -1;
				while (
					((foundIndex = text.indexOf(query.search, startIndex)),
						foundIndex !== -1)
				) {
					const matchPosition = node.getStart(sourceFile)
						+ foundIndex;
					const location = ts.getLineAndCharacterOfPosition(
						sourceFile,
						matchPosition,
					);
					const pathAtPosition = getCodePathAtPosition(
						sourceFile,
						matchPosition,
						" / ",
					);

					results.push(
						formatResult(
							sourceFile,
							{
								file: relativePath,
								codePath: pathAtPosition,
								...location,
								match: query.search,
							},
							query.options?.additionalLines,
						),
					);
					startIndex = foundIndex + query.search.length;
				}
			} else {
				// Find all occurrences of regex in the node
				const matches = text.matchAll(query.search);
				for (const match of matches) {
					const matchPosition = node.getStart(sourceFile)
						+ match.index;
					const location = ts.getLineAndCharacterOfPosition(
						sourceFile,
						matchPosition,
					);
					const pathAtPosition = getCodePathAtPosition(
						sourceFile,
						matchPosition,
						" / ",
					);

					results.push(
						formatResult(
							sourceFile,
							{
								file: relativePath,
								codePath: pathAtPosition,
								...location,
								match: match[0],
							},
							query.options?.additionalLines,
						),
					);
				}
			}
		}
	}
	return results;
}

if (require.main === module) {
	const argv = yargs
		.usage("Code search utility\n\nUsage: $0 [options]")
		.options({
			include: {
				alias: "i",
				describe:
					"Glob of files to include in the search. Default: all",
				type: "string",
				array: true,
			},
			exclude: {
				alias: "e",
				describe:
					"Glob of files to exclude from the search. Default: none",
				type: "string",
				array: true,
			},
			codePattern: {
				alias: "c",
				describe:
					"Glob of code paths to include in the search, e.g. 'class*/methodName'. Default: all",
				type: "string",
				array: true,
			},
			excludeCodePatterns: {
				alias: "x",
				describe:
					"Glob of code paths to exclude from the search, e.g. 'class*/methodName'. Default: none",
				type: "string",
				array: true,
			},
			regex: {
				alias: "r",
				describe:
					"Whether the search should be interpreted as a regex (true) or a simple string (false). Default: false",
				type: "boolean",
			},
			search: {
				alias: "s",
				describe: "What to search for",
				type: "string",
			},
			lines: {
				alias: "l",
				describe: "How many additional lines around the match to show",
				type: "number",
				default: 3,
			},
		})
		.wrap(Math.min(100, yargs.terminalWidth()))
		.demandOption("search", "Please specify a search query")
		.parseSync();

	const query: CodeFindQuery = {
		filePatterns: argv.include,
		excludeFilePatterns: argv.exclude,
		codePatterns: argv.codePattern,
		excludeCodePatterns: argv.excludeCodePatterns,
		search: argv.regex ? new RegExp(argv.search) : argv.search,
		options: {
			additionalLines: Math.max(0, argv.lines),
		},
	};

	const start = Date.now();
	const results = codefind(query);
	const duration = Date.now() - start;
	console.log();
	for (const result of results) {
		console.log(
			`${blueBright(bold(result.file))}:${
				yellow(
					(result.line + 1).toString(),
				)
			}:${yellow((result.character + 1).toString())}`,
		);
		console.log(redBright(bold(`⤷ ${result.codePath}`)));
		console.log(result.formatted);
		console.log();
		console.log();
	}

	console.log(
		`Found ${bold(greenBright(results.length.toString()))} result${
			results.length === 1 ? "" : "s"
		} in ${bold(yellow(duration.toString()))} ms`,
	);
	console.log();
}
