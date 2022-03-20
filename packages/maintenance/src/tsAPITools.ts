import { CommandClasses } from "@zwave-js/core";
import * as path from "path";
import ts from "typescript";

// Find this project's root dir
export const projectRoot = process.cwd();

/** Used for ts-morph */
export const tsConfigFilePath = path.join(projectRoot, "tsconfig.json");

export function loadTSConfig(
	packageName: string = "",
	build: boolean = true,
): {
	options: ts.CompilerOptions;
	fileNames: string[];
} {
	const configFileName = ts.findConfigFile(
		packageName
			? path.join(projectRoot, `packages/${packageName}`)
			: projectRoot,
		// eslint-disable-next-line @typescript-eslint/unbound-method
		ts.sys.fileExists,
		build ? "tsconfig.build.json" : "tsconfig.json",
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
			enumExpr.name.getText(
				sourceFile,
			) as unknown as keyof typeof CommandClasses
		];
	} else if (
		ts.isElementAccessExpression(enumExpr) &&
		ts.isStringLiteral(enumExpr.argumentExpression)
	) {
		return CommandClasses[
			enumExpr.argumentExpression
				.text as unknown as keyof typeof CommandClasses
		];
	}
}

export function getCommandClassFromDecorator(
	sourceFile: ts.SourceFile,
	decorator: ts.Decorator,
): CommandClasses | undefined {
	if (!ts.isCallExpression(decorator.expression)) return;
	const decoratorName = decorator.expression.expression.getText(sourceFile);
	if (
		(decoratorName !== "commandClass" && decoratorName !== "API") ||
		decorator.expression.arguments.length !== 1
	)
		return;
	return expressionToCommandClass(
		sourceFile,
		decorator.expression.arguments[0],
	);
}

export function getCommandClassFromClassDeclaration(
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

export function hasNamedImport(
	sourceFile: ts.SourceFile,
	moduleName: string,
	importName: string,
): boolean {
	return !!findImportDeclaration(sourceFile, moduleName, importName);
}

export function findImportDeclaration(
	sourceFile: ts.SourceFile,
	moduleName: string,
	importName: string,
): ts.ImportDeclaration | undefined {
	const importDeclarations = sourceFile.statements
		.filter((s): s is ts.ImportDeclaration => ts.isImportDeclaration(s))
		.filter(
			(i) =>
				i.moduleSpecifier
					.getText(sourceFile)
					.replace(/^["']|["']$/g, "") === moduleName,
		);
	for (const decl of importDeclarations) {
		const named = decl.importClause?.namedBindings;
		if (!named) continue;
		if (
			ts.isNamedImports(named) &&
			named.elements.some((e) => e.name.getText() === importName)
		) {
			return decl;
		}
	}
}
