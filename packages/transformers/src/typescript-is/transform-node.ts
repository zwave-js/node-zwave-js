import * as path from "path";
import ts from "typescript";
import { sliceMapValues } from "./utils";
import type {
	VisitorContext,
	VisitorContextWithFactory,
} from "./visitor-context";
import {
	visitShortCircuit,
	visitType,
	visitUndefinedOrType,
} from "./visitor-type-check";
import * as VisitorUtils from "./visitor-utils";

function createArrowFunction(
	type: ts.Type,
	rootName: string,
	optional: boolean,
	partialVisitorContext: VisitorContextWithFactory,
) {
	const functionMap: VisitorContext["functionMap"] = new Map();
	const functionNames: VisitorContext["functionNames"] = new Set();
	const typeIdMap: VisitorContext["typeIdMap"] = new Map();
	const visitorContext: VisitorContext = {
		...partialVisitorContext,
		functionNames,
		functionMap,
		typeIdMap,
	};
	const f = visitorContext.factory;
	const emitDetailedErrors = !!visitorContext.options.emitDetailedErrors;
	const functionName = partialVisitorContext.options.shortCircuit
		? visitShortCircuit(visitorContext)
		: optional
		? visitUndefinedOrType(type, visitorContext)
		: visitType(type, visitorContext);

	const variableDeclarations: ts.VariableStatement[] = [];
	if (emitDetailedErrors) {
		variableDeclarations.push(
			f.createVariableStatement(
				[f.createModifier(ts.SyntaxKind.ConstKeyword)],
				[
					f.createVariableDeclaration(
						VisitorUtils.pathIdentifier,
						undefined,
						undefined,
						f.createArrayLiteralExpression([
							f.createStringLiteral(rootName),
						]),
					),
				],
			),
		);
	}
	const functionDeclarations = sliceMapValues(functionMap);

	return f.createArrowFunction(
		undefined,
		undefined,
		[
			f.createParameterDeclaration(
				undefined,
				undefined,
				undefined,
				VisitorUtils.objectIdentifier,
				undefined,
				f.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword),
			),
		],
		undefined,
		undefined,
		f.createBlock([
			...variableDeclarations,
			...functionDeclarations,
			f.createReturnStatement(
				f.createCallExpression(
					f.createIdentifier(functionName),
					undefined,
					[VisitorUtils.objectIdentifier],
				),
			),
		]),
	);
}

function transformDecorator(
	node: ts.Decorator,
	parameterType: ts.Type,
	parameterName: string,
	optional: boolean,
	visitorContext: VisitorContextWithFactory,
): ts.Decorator {
	if (ts.isCallExpression(node.expression)) {
		const signature = visitorContext.checker.getResolvedSignature(
			node.expression,
		);
		if (
			signature !== undefined &&
			signature.declaration !== undefined &&
			VisitorUtils.getCanonicalPath(
				path.resolve(signature.declaration.getSourceFile().fileName),
				visitorContext,
			) ===
				path.resolve(path.join(__dirname, "..", "..", "index.d.ts")) &&
			node.expression.arguments.length <= 1
		) {
			const arrowFunction: ts.Expression = createArrowFunction(
				parameterType,
				parameterName,
				optional,
				visitorContext,
			);
			const expression = ts.updateCall(
				node.expression,
				node.expression.expression,
				undefined,
				[arrowFunction].concat(node.expression.arguments),
			);
			return ts.updateDecorator(node, expression);
		}
	}
	return node;
}

/** Figures out an appropriate human-readable name for the variable designated by `node`. */
function extractVariableName(node: ts.Node | undefined) {
	return node !== undefined && ts.isIdentifier(node)
		? node.escapedText.toString()
		: "$";
}

export function transformNode(
	node: ts.Node,
	visitorContext: VisitorContextWithFactory,
): ts.Node {
	const f = visitorContext.factory;
	if (
		ts.isParameter(node) &&
		node.type !== undefined &&
		node.decorators !== undefined
	) {
		const type = visitorContext.checker.getTypeFromTypeNode(node.type);
		const required = !node.initializer && !node.questionToken;
		const mappedDecorators = node.decorators.map((decorator) =>
			transformDecorator(
				decorator,
				type,
				extractVariableName(node.name),
				!required,
				visitorContext,
			),
		);
		return f.updateParameterDeclaration(
			node,
			mappedDecorators,
			node.modifiers,
			node.dotDotDotToken,
			node.name,
			node.questionToken,
			node.type,
			node.initializer,
		);
	} else if (ts.isCallExpression(node)) {
		const signature = visitorContext.checker.getResolvedSignature(node);
		if (
			signature !== undefined &&
			signature.declaration !== undefined &&
			VisitorUtils.getCanonicalPath(
				path.resolve(signature.declaration.getSourceFile().fileName),
				visitorContext,
			) ===
				path.resolve(path.join(__dirname, "..", "..", "index.d.ts")) &&
			node.typeArguments !== undefined &&
			node.typeArguments.length === 1
		) {
			const name = visitorContext.checker.getTypeAtLocation(
				signature.declaration,
			).symbol.name;
			const isEquals =
				name === "equals" ||
				name === "createEquals" ||
				name === "assertEquals" ||
				name === "createAssertEquals";
			const isAssert =
				name === "assertEquals" ||
				name === "assertType" ||
				name === "createAssertEquals" ||
				name === "createAssertType";
			const emitDetailedErrors =
				visitorContext.options.emitDetailedErrors === "auto"
					? isAssert
					: visitorContext.options.emitDetailedErrors;

			const typeArgument = node.typeArguments[0];
			const type =
				visitorContext.checker.getTypeFromTypeNode(typeArgument);
			const arrowFunction = createArrowFunction(
				type,
				extractVariableName(node.arguments[0]),
				false,
				{
					...visitorContext,
					options: {
						...visitorContext.options,
						disallowSuperfluousObjectProperties:
							isEquals ||
							visitorContext.options
								.disallowSuperfluousObjectProperties,
						emitDetailedErrors,
					},
				},
			);

			return ts.updateCall(node, node.expression, node.typeArguments, [
				...node.arguments,
				arrowFunction,
			]);
		}
	} else if (
		visitorContext.options.transformNonNullExpressions &&
		ts.isNonNullExpression(node)
	) {
		const expression = node.expression;
		return f.updateNonNullExpression(
			node,
			f.createParenthesizedExpression(
				f.createConditionalExpression(
					f.createParenthesizedExpression(
						f.createBinaryExpression(
							f.createBinaryExpression(
								f.createTypeOfExpression(expression),
								f.createToken(
									ts.SyntaxKind.EqualsEqualsEqualsToken,
								),
								f.createStringLiteral("undefined"),
							),
							f.createToken(ts.SyntaxKind.BarBarToken),
							f.createBinaryExpression(
								expression,
								f.createToken(
									ts.SyntaxKind.EqualsEqualsEqualsToken,
								),
								f.createNull(),
							),
						),
					),
					f.createToken(ts.SyntaxKind.QuestionToken),
					f.createCallExpression(
						f.createParenthesizedExpression(
							f.createArrowFunction(
								undefined,
								undefined,
								[],
								undefined,
								f.createToken(
									ts.SyntaxKind.EqualsGreaterThanToken,
								),
								f.createBlock(
									[
										f.createThrowStatement(
											f.createNewExpression(
												f.createIdentifier("Error"),
												undefined,
												[
													f.createTemplateExpression(
														f.createTemplateHead(
															`${expression.getText()} was non-null asserted but is `,
														),
														[
															f.createTemplateSpan(
																expression,
																f.createTemplateTail(
																	"",
																),
															),
														],
													),
												],
											),
										),
									],
									false,
								),
							),
						),
						undefined,
						[],
					),
					f.createToken(ts.SyntaxKind.ColonToken),
					expression,
				),
			),
		);
	}
	return node;
}
