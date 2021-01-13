/*!
 * This scripts checks if there is anything wrong with the defined CC interviews.
 * Since v3.0.0, non-application CCs may no longer depend on application CCs because
 * the interview for application CCs on the root endpoint is deferred
 */

import { applicationCCs, CommandClasses, getCCName } from "@zwave-js/core";
import * as path from "path";
import ts from "typescript";
import { reportProblem } from "../../../maintenance/tools";
import {
	expressionToCommandClass,
	getCommandClassFromDecorator,
} from "./shared";
import { loadTSConfig, projectRoot } from "./tsTools";

/* wotan-disable no-useless-predicate */

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

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

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
						reportProblem({
							severity: "warn",
							filename: relativePath,
							line: location.line + 1,
							message: `Could not determine defined CC for ${node.name.text}!`,
						});
					}
					return;
				}
				// Ensure the filename ends with CC.ts - otherwise CommandClass.from won't find it
				if (!relativePath.endsWith("CC.ts")) {
					hasError = true;
					reportProblem({
						severity: "error",
						filename: relativePath,
						message: `Files containing CC implementations MUST end with "CC.ts"!`,
					});
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
										`Interview procedure of the non-application CC ${getCCName(
											ccId,
										)} must not depend on application CCs, but depends on the CC${
											requiredApplicationCCs.length > 1
												? "s"
												: ""
										} ${requiredApplicationCCs
											.map((cc) => getCCName(cc))
											.join(", ")}!`,
									);
								}
							}
						} catch (e) {
							hasError = true;
							reportProblem({
								severity: "error",
								filename: relativePath,
								line: location.line + 1,
								message: e.message,
							});
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

if (require.main === module)
	lintCCInterview()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
