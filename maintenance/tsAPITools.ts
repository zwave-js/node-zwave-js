import { CommandClasses } from "@zwave-js/core";
import ts from "typescript";

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
