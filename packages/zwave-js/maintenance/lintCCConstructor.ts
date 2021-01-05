/*!
 * This scripts checks the constructors of Command Classes for common errors.
 * Since v3.7.0, all report-type application CCs must call persistValues in their constructor,
 * so values can be mapped from the root endpoint to endpoint 1.
 */

import { applicationCCs, CommandClasses } from "@zwave-js/core";
import { blue, green } from "ansi-colors";
import * as path from "path";
import ts from "typescript";
import { reportProblem } from "../../../maintenance/tools";
import { getCommandClassFromDecorator } from "./shared";
import { loadTSConfig, projectRoot } from "./tsTools";

/* wotan-disable no-useless-predicate */

// Configure which CCs are excluded from this check
const whitelistedCCs: CommandClasses[] = [
	// Configuration CC has a different way of storing its values
	CommandClasses.Configuration,
	// Firmware Update CC is handled entirely on a request base
	CommandClasses["Firmware Update Meta Data"],
];

function isCallToPersistValues(node: ts.Node): node is ts.CallExpression {
	if (
		ts.isExpressionStatement(node) &&
		ts.isCallExpression(node.expression) &&
		ts.isPropertyAccessExpression(node.expression.expression)
	) {
		const expr = node.expression.expression;
		return (
			expr.expression.kind === ts.SyntaxKind.ThisKeyword &&
			expr.name.text === "persistValues"
		);
	}
	return false;
}

function isCheckForDeserializationOptions(
	node: ts.Node,
): node is ts.IfStatement & { thenStatement: ts.Block } {
	return (
		ts.isIfStatement(node) &&
		ts.isCallExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) &&
		node.expression.expression.text === "gotDeserializationOptions" &&
		ts.isBlock(node.thenStatement)
	);
}

function getCommandClassFromClassDeclaration(
	sourceFile: ts.SourceFile,
	node: ts.ClassDeclaration,
): CommandClasses | undefined {
	if (node.decorators && node.decorators.length > 0) {
		for (const decorator of node.decorators) {
			const ccId = getCommandClassFromDecorator(sourceFile, decorator);
			if (ccId != undefined) return ccId;
		}
	}
}

function getCommandClassFromClassOrParent(
	checker: ts.TypeChecker,
	sourceFile: ts.SourceFile,
	node: ts.ClassDeclaration,
): CommandClasses | undefined {
	while (node) {
		const ccId = getCommandClassFromClassDeclaration(sourceFile, node);
		if (ccId != undefined) return ccId;

		if (!node.heritageClauses) return;
		const parentTypeClause = node.heritageClauses.find(
			(c) =>
				c.token === ts.SyntaxKind.ExtendsKeyword &&
				c.types.length === 1,
		);
		if (!parentTypeClause) return;
		const symbol = checker.getSymbolAtLocation(
			parentTypeClause.types[0].expression,
		);
		if (!symbol || !ts.isClassDeclaration(symbol.valueDeclaration)) return;
		node = symbol.valueDeclaration;
	}
}

export function lintCCConstructors(): Promise<void> {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig();
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

	let hasError = false;

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = path
			.relative(projectRoot, sourceFile.fileName)
			.replace(/\\/g, "/");

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

		// Only look at the commandclass dir
		if (!relativePath.includes("/commandclass/")) {
			continue;
		}
		// Ignore test files, compiled files and the index
		if (
			relativePath.endsWith(".test.ts") ||
			relativePath.endsWith("index.ts") ||
			// and the manufacturer proprietary implementations
			relativePath.includes("/manufacturerProprietary/")
		) {
			continue;
		}

		// Visit each CC class and see if it overwrites determineRequiredCCInterviews
		ts.forEachChild(sourceFile, (node) => {
			// Only look at CC class declarations ending with "Report"
			if (
				ts.isClassDeclaration(node) &&
				node.name &&
				node.name.text.includes("CC") &&
				node.name.text.endsWith("Report")
			) {
				const classLocation = ts.getLineAndCharacterOfPosition(
					sourceFile,
					node.getStart(sourceFile, false),
				);
				const fail = (
					reason: string,
					severity: "error" | "warn" = "error",
				) => {
					if (severity === "error") hasError = true;
					reportProblem({
						severity,
						filename: relativePath,
						line: classLocation.line + 1,
						message: reason,
					});
				};

				// Only look at the constructor
				const constructor = node.members.find(
					(member): member is ts.ConstructorDeclaration =>
						ts.isConstructorDeclaration(member),
				);
				if (!constructor || !constructor.body) {
					if (node.name.text.endsWith("Report")) {
						fail(
							`The CC report class ${node.name.text} has no constructor!`,
						);
					}
					return;
				}

				const ccId = getCommandClassFromClassOrParent(
					program.getTypeChecker(),
					sourceFile,
					node,
				);
				// Ignore whitelisted CCs
				if (ccId != undefined && whitelistedCCs.includes(ccId)) return;
				// Error only for Application CCs
				const isApplicationCC =
					ccId != undefined && applicationCCs.includes(ccId);
				const severity = isApplicationCC ? "error" : "warn";

				// persistValues must be called:
				// a) in CCs with name *Report (mandatory):
				//    a1) either in the constructor body
				//    a2) or inside an if statement with argument gotDeserializationOptions
				// b) except if:
				//    b1) there is a method definition for mergePartialCCs
				//    b2) there is a @noCCValues comment

				const hasCallToPersistValuesInConstructorBody = !!constructor.body.statements.find(
					isCallToPersistValues,
				);
				const checkForDeserializationOptions = constructor.body.statements.find(
					isCheckForDeserializationOptions,
				);
				const hasCallToPersistValuesInCheck =
					checkForDeserializationOptions &&
					!!checkForDeserializationOptions.thenStatement.statements.find(
						isCallToPersistValues,
					);
				const hasMergePartialCCsImplementation = !!node.members.find(
					(member) =>
						ts.isMethodDeclaration(member) &&
						ts.isIdentifier(member.name) &&
						member.name.text === "mergePartialCCs",
				);
				const hasNoCCValuesComment = node.members.some((member) => {
					const sourceText = sourceFile.getText();
					const comments = ts.getLeadingCommentRanges(
						sourceText,
						member.getFullStart(),
					);
					if (!comments) return false;
					const commentTexts = comments.map((c) =>
						sourceText.slice(c.pos, c.end),
					);
					return commentTexts.some((c) =>
						c.trim().startsWith("// @noCCValues"),
					);
				});

				// b)
				if (hasMergePartialCCsImplementation || hasNoCCValuesComment) {
					return;
				}

				// a)
				if (hasCallToPersistValuesInConstructorBody) return;
				if (hasCallToPersistValuesInCheck) return;
				fail(
					`The${
						isApplicationCC ? " application" : ""
					} CC report class ${blue(node.name.text)} ${
						severity === "error" ? "needs" : "might need"
					} a call to ${blue(
						"persistValues()",
					)} in the constructor or an implementation for ${blue(
						"mergePartialCCs()",
					)}
If this is a false-positive, consider suppressing this error with a ${green(
						"// @noCCValues",
					)} comment.`,
					severity,
				);
				return;
			}
		});
	}
	if (hasError) {
		return Promise.reject(
			new Error(
				"Linting the CC constructors was not successful! See log output for details.",
			),
		);
	} else {
		return Promise.resolve();
	}
}

if (require.main === module)
	lintCCConstructors()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
