import path from "node:path";
import { fileURLToPath } from "node:url";

import { API, type Program } from "@typescript/native/sync";
import { CommandClasses } from "@zwave-js/core";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

/**
 * Opens a tsconfig with the native TypeScript API.
 * The returned API must be closed when done, so its compiler process exits.
 */
export function openTSProgram(
	packageName: string = "",
	variant: string = "build",
): { api: API; program: Program } {
	const configFileName = path.join(
		packageName ? path.join(repoRoot, `packages/${packageName}`) : repoRoot,
		variant ? `tsconfig.${variant}.json` : "tsconfig.json",
	);

	const api = new API({ cwd: repoRoot });
	const project = api
		.createSnapshot({ openProjects: [configFileName] })
		.getConfiguredProject(configFileName);
	if (!project) {
		api.close();
		throw new Error(`could not load ${configFileName}`);
	}

	return { api, program: project.program };
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
