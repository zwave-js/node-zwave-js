/*!
 * This scripts checks that all CC API classes have a @noValidateArgs decorator on their methods which need one
 */

import { getCCName } from "@zwave-js/core";
import {
	getCommandClassFromDecorator,
	hasComment,
	loadTSConfig,
	projectRoot,
	reportProblem,
} from "@zwave-js/maintenance";
import { blue, green } from "ansi-colors";
import * as path from "path";
import ts from "typescript";

function hasNoValidateArgsComment(
	node: ts.Node,
	sourceFile: ts.SourceFile,
): boolean {
	return hasComment(sourceFile, node, (text) =>
		text.includes("@noValidateArgs"),
	);
}

function hasInternalJsDoc(node: ts.Node, sourceFile: ts.SourceFile): boolean {
	return hasComment(
		sourceFile,
		node,
		(text, kind) =>
			text.includes("@internal") &&
			kind === ts.SyntaxKind.MultiLineCommentTrivia,
	);
}

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

		ts.forEachChild(sourceFile, (node) => {
			// Only look at class decorations that are annotated with @API and don't have a // @noValidateArgs comment
			if (!ts.isClassDeclaration(node)) return;
			if (!node.decorators) return;
			if (hasNoValidateArgsComment(node, sourceFile)) return;

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

			// Check all public method declarations with arguments that are not called supportsCommand
			const methods = node.members
				.filter(
					(m): m is ts.MethodDeclaration =>
						ts.isMethodDeclaration(m) &&
						// Ignore overload declarations
						!!m.body &&
						m.parameters.length > 0,
				)
				.filter(
					(m) =>
						ts.isIdentifier(m.name) &&
						m.name.text !== "supportsCommand" &&
						m.name.text !== "isSetValueOptimistic",
				)
				.filter((m) =>
					m.modifiers?.some(
						(mod) => mod.kind === ts.SyntaxKind.PublicKeyword,
					),
				)
				// Ignore methods marked with @internal
				.filter((m) => !hasInternalJsDoc(m, sourceFile));

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

					if (hasNoValidateArgsComment(method, sourceFile)) {
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
Public CC API methods should have argument validation to catch user errors.
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
