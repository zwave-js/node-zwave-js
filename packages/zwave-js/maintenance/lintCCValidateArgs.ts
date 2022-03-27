/*!
 * This scripts checks which CCs have `toLogEntry` implemented
 */

import { getCCName } from "@zwave-js/core";
import {
	getCommandClassFromDecorator,
	loadTSConfig,
	projectRoot,
	reportProblem,
} from "@zwave-js/maintenance";
import { blue, green } from "ansi-colors";
import * as path from "path";
import ts from "typescript";

export function lintCCValidateArgs(): Promise<void> {
	// Create a Program to represent the project, then pull out the
	// source file to parse its AST.

	const tsConfig = loadTSConfig("zwave-js");
	const program = ts.createProgram(tsConfig.fileNames, tsConfig.options);

	let hasError = false;

	// Scan all source files
	for (const sourceFile of program.getSourceFiles()) {
		const relativePath = path
			.relative(projectRoot, sourceFile.fileName)
			.replace(/\\/g, "/");

		// Only look at files in this package
		if (relativePath.startsWith("..")) continue;

		// Only look at *CC.ts files in the commandclass dir
		if (
			!relativePath.includes("/commandclass/") ||
			!relativePath.endsWith("CC.ts")
		) {
			continue;
		}

		// Visit each CC API class and see if it overwrites determineRequiredCCInterviews
		ts.forEachChild(sourceFile, (node) => {
			// Only look at class decorations that are annotated with @API
			if (!ts.isClassDeclaration(node)) return;
			if (!node.decorators) return;
			const cc = node.decorators
				.filter(
					(d) =>
						ts.isCallExpression(d.expression) &&
						ts.isIdentifier(d.expression.expression) &&
						d.expression.expression.text === "API",
				)
				.map((d) => getCommandClassFromDecorator(sourceFile, d))
				.find((cc) => cc != undefined);
			if (!cc) return;

			// Check all public method declarations that are not called supportsCommand
			const methods = node.members
				.filter((m): m is ts.MethodDeclaration =>
					ts.isMethodDeclaration(m),
				)
				.filter(
					(m) =>
						ts.isIdentifier(m.name) &&
						m.name.text !== "supportsCommand",
				)
				.filter((m) =>
					m.modifiers?.some(
						(mod) => mod.kind === ts.SyntaxKind.PublicKeyword,
					),
				);

			if (methods.length === 0) {
				// ignore empty classes
				return;
			} else {
				for (const method of methods) {
					const methodLocation = ts.getLineAndCharacterOfPosition(
						sourceFile,
						method.getStart(sourceFile, false),
					);
					const fail = (
						reason: string,
						severity: "error" | "warn" = "error",
					) => {
						if (severity === "error") hasError = true;
						reportProblem({
							severity,
							filename: relativePath,
							line: methodLocation.line + 1,
							message: reason,
						});
					};

					const hasNoValidateArgsComment = ts
						.getLeadingCommentRanges(
							sourceFile.getFullText(),
							method.getFullStart(),
						)
						?.some((r) => {
							const text = sourceFile
								.getFullText()
								.slice(r.pos, r.end);
							return text.includes("@noValidateArgs");
						});
					if (hasNoValidateArgsComment) {
						// ignored
						return;
					} else {
						const hasValidateArgsDecorator =
							!!method.decorators?.some(
								(d) =>
									ts.isCallExpression(d.expression) &&
									ts.isIdentifier(d.expression.expression) &&
									d.expression.expression.text ===
										"validateArgs",
							);
						if (!hasValidateArgsDecorator) {
							fail(
								`The API class for the ${blue(
									getCCName(cc),
								)} CC is missing the ${blue(
									"@validateArgs()",
								)} decorator on the ${blue(
									(method.name as ts.Identifier).text,
								)} method.
If this is a false-positive, consider suppressing this error with a ${green(
									"// @noValidateArgs",
								)} comment before the method implementation.`,
								"error",
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
				"Linting the CC API method validations was not successful! See log output for details.",
			),
		);
	} else {
		return Promise.resolve();
	}
}

if (require.main === module) {
	lintCCValidateArgs()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
}
