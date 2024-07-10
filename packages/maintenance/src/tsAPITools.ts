import { CommandClasses } from "@zwave-js/core";
import * as path from "node:path";
import ts from "typescript";

// Find this project's root dir
export const projectRoot = process.cwd();
export const repoRoot = path.normalize(
	__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)),
);

/** Used for ts-morph */
export const tsConfigFilePathForDocs = path.join(
	repoRoot,
	"tsconfig.docs.json",
);

export function loadTSConfig(
	packageName: string = "",
	build: boolean = true,
): {
	options: ts.CompilerOptions;
	fileNames: string[];
} {
	const configFileName = ts.findConfigFile(
		packageName ? path.join(repoRoot, `packages/${packageName}`) : repoRoot,
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
		(!ts.isPropertyAccessExpression(enumExpr)
			&& !ts.isElementAccessExpression(enumExpr))
		|| enumExpr.expression.getText(sourceFile) !== "CommandClasses"
	) {
		return;
	}
	if (ts.isPropertyAccessExpression(enumExpr)) {
		return CommandClasses[
			enumExpr.name.getText(
				sourceFile,
			) as unknown as keyof typeof CommandClasses
		];
	} else if (
		ts.isElementAccessExpression(enumExpr)
		&& ts.isStringLiteral(enumExpr.argumentExpression)
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
		(decoratorName !== "commandClass" && decoratorName !== "API")
		|| decorator.expression.arguments.length !== 1
	) {
		return;
	}
	return expressionToCommandClass(
		sourceFile,
		decorator.expression.arguments[0],
	);
}

export function getCommandClassFromClassDeclaration(
	sourceFile: ts.SourceFile,
	node: ts.ClassDeclaration,
): CommandClasses | undefined {
	if (node.modifiers?.length) {
		for (const mod of node.modifiers) {
			if (!ts.isDecorator(mod)) continue;
			const ccId = getCommandClassFromDecorator(sourceFile, mod);
			if (ccId != undefined) return ccId;
		}
	}
}

export function hasComment(
	sourceFile: ts.SourceFile,
	node: ts.Node,
	predicate: (text: string, commentKind: ts.CommentKind) => boolean,
): boolean {
	return (
		ts
			.getLeadingCommentRanges(
				sourceFile.getFullText(),
				node.getFullStart(),
			)
			?.some((r) => {
				const text = sourceFile.getFullText().slice(r.pos, r.end);
				return predicate(text, r.kind);
			}) ?? false
	);
}
