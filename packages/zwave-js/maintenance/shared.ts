import { CommandClasses } from "@zwave-js/core";
import * as prettier from "prettier";
import ts from "typescript";

// Find this project's root dir
export const projectRoot = process.cwd();

export function loadTSConfig(): {
	options: ts.CompilerOptions;
	fileNames: string[];
} {
	const configFileName = ts.findConfigFile(
		"../",
		// eslint-disable-next-line @typescript-eslint/unbound-method
		ts.sys.fileExists,
		"tsconfig.build.json",
	);
	if (!configFileName) throw new Error("tsconfig.json not found");

	const configFileText = ts.sys.readFile(configFileName);
	if (!configFileText) throw new Error("could not read tsconfig.json");

	const parsedCommandLine = ts.getParsedCommandLineOfConfigFile(
		configFileName,
		{},
		ts.sys as any,
	);
	if (!parsedCommandLine) throw new Error("could not parse tsconfig.json");

	return {
		options: parsedCommandLine.options,
		fileNames: parsedCommandLine.fileNames,
	};
}

export function compareStrings(a: string, b: string): number {
	if (a > b) return 1;
	if (b > a) return -1;
	return 0;
}

// Make the linter happy
export function formatWithPrettier(
	filename: string,
	sourceText: string,
): string {
	const prettierOptions = {
		...require("../../../.prettierrc"),
		// To infer the correct parser
		filepath: filename,
	};
	return prettier.format(sourceText, prettierOptions);
}

export function expressionToCommandClass(
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

export function getCommandClassFromDecorator(
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
