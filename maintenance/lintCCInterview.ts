/*!
 * This scripts checks if there is anything wrong with the defined CC interviews.
 * Since v3.0.0, non-application CCs may no longer depend on application CCs because
 * the interview for application CCs on the root endpoint is deferred
 */

import { red, yellow } from "ansi-colors";
import * as path from "path";
import ts from "typescript";
import {
	applicationCCs,
	CommandClasses,
} from "../src/lib/commandclass/CommandClasses";
import { getEnumMemberName } from "../src/lib/util/misc";
import { loadTSConfig, projectRoot } from "./shared";

function expressionToCommandClass(
	sourceFile: ts.SourceFile,
	enumExpr: ts.Node,
): CommandClasses | undefined {
	if (
		(!ts.isPropertyAccessExpression(enumExpr) &&
			!ts.isElementAccessExpression(enumExpr)) ||
		enumExpr.expression.getText(sourceFile) !== "CommandClasses"
	)
		return;
	if (ts.isPropertyAccessExpression(enumExpr)) {
		return CommandClasses[
			(enumExpr.name.getText(
				sourceFile,
			) as unknown) as keyof typeof CommandClasses
		];
	} else if (
		ts.isElementAccessExpression(enumExpr) &&
		ts.isStringLiteral(enumExpr.argumentExpression)
	) {
		return CommandClasses[
			(enumExpr.argumentExpression
				.text as unknown) as keyof typeof CommandClasses
		];
	}
}

function getCommandClassFromDecorator(
	sourceFile: ts.SourceFile,
	decorator: ts.Decorator,
): CommandClasses | undefined {
	if (!ts.isCallExpression(decorator.expression)) return;
	if (
		decorator.expression.expression.getText(sourceFile) !==
			"commandClass" ||
		decorator.expression.arguments.length !== 1
	)
		return;
	return expressionToCommandClass(
		sourceFile,
		decorator.expression.arguments[0],
	);
}

function getRequiredInterviewCCsFromMethod(
	sourceFile: ts.SourceFile,
	method: ts.MethodDeclaration,
): CommandClasses[] | undefined {
	const returnExpression = method.body?.statements.find(
		(statement) =>
			ts.isReturnStatement(statement) &&
			statement.expression &&
			ts.isArrayLiteralExpression(statement.expression),
	) as ts.ReturnStatement | undefined;
	if (!returnExpression) return;
	const elements = (returnExpression.expression as ts.ArrayLiteralExpression)
		.elements;
	// TODO: Check if that includes the super call
	const ret = elements
		.map((e) => expressionToCommandClass(sourceFile, e))
		.filter((cc) => cc != undefined) as CommandClasses[];
	return ret;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function lintCCInterview(): Promise<void> {
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
		// Only look at the commandclass dir
		if (!relativePath.includes("/commandclass/")) {
			continue;
		}
		// Ignore test files and the index
		if (
			relativePath.endsWith(".test.ts") ||
			relativePath.endsWith("index.ts")
		) {
			continue;
		}

		// Visit each CC class and see if it overwrites determineRequiredCCInterviews
		ts.forEachChild(sourceFile, (node) => {
			// Only look at class declarations ending with "CC" that have a commandClass decorator
			if (
				ts.isClassDeclaration(node) &&
				node.name &&
				node.name.text.endsWith("CC")
			) {
				let ccId: CommandClasses | undefined;
				if (node.decorators && node.decorators.length > 0) {
					for (const decorator of node.decorators) {
						ccId = getCommandClassFromDecorator(
							sourceFile,
							decorator,
						);
						if (ccId != undefined) break;
					}
				}
				if (ccId == undefined) {
					if (!relativePath.includes("/manufacturerProprietary/")) {
						const location = ts.getLineAndCharacterOfPosition(
							sourceFile,
							node.getStart(sourceFile, false),
						);
						console.warn(
							yellow(
								`[WARN] ${relativePath}:${
									location.line + 1
								}: Could not determine defined CC for ${
									node.name.text
								}!`,
							),
						);
					}
					return;
				}
				// Only look at implementations of determineRequiredCCInterviews
				for (const member of node.members) {
					if (
						ts.isMethodDeclaration(member) &&
						member.name.getText(sourceFile) ===
							"determineRequiredCCInterviews"
					) {
						const location = ts.getLineAndCharacterOfPosition(
							sourceFile,
							member.getStart(sourceFile, false),
						);
						try {
							const requiredCCs = getRequiredInterviewCCsFromMethod(
								sourceFile,
								member,
							);
							if (!requiredCCs) {
								throw new Error(
									`Could not determine required CC interviews for ${node.name.text}!`,
								);
							} else if (!applicationCCs.includes(ccId)) {
								// This is a non-application CC
								const requiredApplicationCCs = requiredCCs.filter(
									(cc) => applicationCCs.includes(cc),
								);
								if (requiredApplicationCCs.length > 0) {
									// that depends on an application CC
									throw new Error(
										`Interview procedure of the non-application CC ${getEnumMemberName(
											CommandClasses,
											ccId,
										)} must not depend on application CCs, but depends on the CC${
											requiredApplicationCCs.length > 1
												? "s"
												: ""
										} ${requiredApplicationCCs
											.map((cc) =>
												getEnumMemberName(
													CommandClasses,
													cc,
												),
											)
											.join(", ")}!`,
									);
								}
							}
						} catch (e) {
							hasError = true;
							console.warn(
								red(
									`[ERROR] ${relativePath}:${
										location.line + 1
									}:`,
								) + `\n${e.message}\n`,
							);
						}
					}
				}
			}
		});
	}
	if (hasError) {
		return Promise.reject(
			new Error(
				"Linting the CC interview was not successful! See log output for details.",
			),
		);
	} else {
		return Promise.resolve();
	}
}

if (!module.parent)
	lintCCInterview()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
