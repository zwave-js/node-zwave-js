import * as path from "path";
import ts from "typescript";
import { sliceMapValues } from "./utils";
import type {
	FileSpecificVisitorContext,
	VisitorContext,
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
	partialVisitorContext: FileSpecificVisitorContext,
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

// function transformDecorator(
// 	node: ts.Decorator,
// 	parameterType: ts.Type,
// 	parameterName: string,
// 	optional: boolean,
// 	visitorContext: VisitorContextWithFactory,
// ): ts.Decorator {
// 	if (ts.isCallExpression(node.expression)) {
// 		const signature = visitorContext.checker.getResolvedSignature(
// 			node.expression,
// 		);
// 		if (
// 			signature !== undefined &&
// 			signature.declaration !== undefined &&
// 			VisitorUtils.getCanonicalPath(
// 				path.resolve(signature.declaration.getSourceFile().fileName),
// 				visitorContext,
// 			) ===
// 				path.resolve(path.join(__dirname, "..", "..", "index.d.ts")) &&
// 			node.expression.arguments.length <= 1
// 		) {
// 			const arrowFunction: ts.Expression = createArrowFunction(
// 				parameterType,
// 				parameterName,
// 				optional,
// 				visitorContext,
// 			);
// 			const expression = ts.updateCall(
// 				node.expression,
// 				node.expression.expression,
// 				undefined,
// 				[arrowFunction].concat(node.expression.arguments),
// 			);
// 			return ts.updateDecorator(node, expression);
// 		}
// 	}
// 	return node;
// }

function isValidateArgsDecorator(
	decorator: ts.Decorator,
	visitorContext: FileSpecificVisitorContext,
): boolean {
	if (ts.isCallExpression(decorator.expression)) {
		const signature = visitorContext.checker.getResolvedSignature(
			decorator.expression,
		);
		const decoratorName = decorator.expression.expression.getText(
			decorator.getSourceFile(),
		);

		if (
			signature !== undefined &&
			signature.declaration !== undefined &&
			VisitorUtils.getCanonicalPath(
				path.resolve(signature.declaration.getSourceFile().fileName),
				visitorContext,
			) ===
				path.resolve(path.join(__dirname, "../../build/index.d.ts")) &&
			decoratorName === "validateArgs"
		) {
			return true;
		}
	}
	return false;
}

/** Figures out an appropriate human-readable name for the variable designated by `node`. */
function extractVariableName(node: ts.Node | undefined) {
	return node !== undefined && ts.isIdentifier(node)
		? node.escapedText.toString()
		: "$";
}

function transformDecoratedMethod(
	method: ts.MethodDeclaration,
	validateArgsDecorator: ts.Decorator,
	visitorContext: FileSpecificVisitorContext,
) {
	// Remove the decorator and TODO: prepend its body with the validation code
	const f = visitorContext.factory;

	let body = method.body ?? f.createBlock([], true);
	const newStatements: ts.Statement[] = [];
	for (const param of method.parameters) {
		if (!param.type) continue;

		let typeName: string | undefined;
		const type = visitorContext.checker.getTypeFromTypeNode(param.type);
		let anonymous: boolean;
		let arrowFunction: ts.ArrowFunction;

		switch (param.type.kind) {
			case ts.SyntaxKind.NumberKeyword:
			case ts.SyntaxKind.StringKeyword:
			case ts.SyntaxKind.BooleanKeyword:
			case ts.SyntaxKind.BigIntKeyword:
			case ts.SyntaxKind.TypeReference:
				// This is a type with an "easy" name we can factor out of the method body
				typeName = param.type.getText();
				anonymous = false;
				arrowFunction = createArrowFunction(type, typeName, false, {
					...visitorContext,
					options: {
						...visitorContext.options,
						emitDetailedErrors: false,
					},
				});
				createLocalAssertExpression;

			// Fall through

			default:
				// This is a type with a "complicated" name, we need to check within the function body
				if (!typeName) {
					const typeContext: VisitorContext = {
						...visitorContext,
						options: {
							...visitorContext.options,
							emitDetailedErrors: false,
						},
						functionNames: new Set(),
						functionMap: new Map(),
						typeIdMap: new Map(),
					};

					typeName = visitType(type, typeContext);
					anonymous = true;
					arrowFunction = createArrowFunction(
						type,
						typeName,
						false,
						typeContext,
					);
				}

				const argName = (param.name as ts.Identifier).text;
				const assertion = createLocalAssertExpression(
					f,
					argName,
					typeName,
					anonymous!,
				);
				if (!visitorContext.typeAssertions.has(typeName)) {
					visitorContext.typeAssertions.set(typeName, arrowFunction!);
				}
				newStatements.push(assertion);
		}
	}
	body = f.updateBlock(body, [...newStatements, ...body.statements]);

	return f.updateMethodDeclaration(
		method,
		method.decorators?.filter((d) => d !== validateArgsDecorator),
		method.modifiers,
		method.asteriskToken,
		method.name,
		method.questionToken,
		method.typeParameters,
		method.parameters,
		method.type,
		body,
	);
}

export function createGenericAssertFunction(
	factory: ts.NodeFactory,
): ts.FunctionDeclaration {
	// Generated with https://ts-ast-viewer.com
	return factory.createFunctionDeclaration(
		undefined,
		undefined,
		undefined,
		factory.createIdentifier("__assertType"),
		undefined,
		[
			factory.createParameterDeclaration(
				undefined,
				undefined,
				undefined,
				factory.createIdentifier("argName"),
				undefined,
				factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
				undefined,
			),
			factory.createParameterDeclaration(
				undefined,
				undefined,
				undefined,
				factory.createIdentifier("typeName"),
				undefined,
				factory.createUnionTypeNode([
					factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
					factory.createKeywordTypeNode(
						ts.SyntaxKind.UndefinedKeyword,
					),
				]),
				undefined,
			),
			factory.createParameterDeclaration(
				undefined,
				undefined,
				undefined,
				factory.createIdentifier("boundHasError"),
				undefined,
				factory.createFunctionTypeNode(
					undefined,
					[],
					factory.createKeywordTypeNode(ts.SyntaxKind.BooleanKeyword),
				),
				undefined,
			),
		],
		undefined,
		factory.createBlock(
			[
				// require the Error types here, so we don't depend on any potentially existing imports
				// Additionally, imports don't seem to be matched to the usage here, so we avoid further problems
				factory.createVariableStatement(
					undefined,
					factory.createVariableDeclarationList(
						[
							factory.createVariableDeclaration(
								factory.createObjectBindingPattern([
									factory.createBindingElement(
										undefined,
										undefined,
										factory.createIdentifier("ZWaveError"),
										undefined,
									),
									factory.createBindingElement(
										undefined,
										undefined,
										factory.createIdentifier(
											"ZWaveErrorCodes",
										),
										undefined,
									),
								]),
								undefined,
								undefined,
								factory.createCallExpression(
									factory.createIdentifier("require"),
									undefined,
									[
										factory.createStringLiteral(
											"@zwave-js/core",
										),
									],
								),
							),
						],
						ts.NodeFlags.Const,
					),
				),
				factory.createIfStatement(
					factory.createCallExpression(
						factory.createIdentifier("boundHasError"),
						undefined,
						[],
					),
					factory.createBlock(
						[
							factory.createThrowStatement(
								factory.createNewExpression(
									factory.createIdentifier("ZWaveError"),
									undefined,
									[
										factory.createConditionalExpression(
											factory.createIdentifier(
												"typeName",
											),
											factory.createToken(
												ts.SyntaxKind.QuestionToken,
											),
											factory.createTemplateExpression(
												factory.createTemplateHead(
													"",
													"",
												),
												[
													factory.createTemplateSpan(
														factory.createIdentifier(
															"argName",
														),
														factory.createTemplateMiddle(
															" is not a ",
															" is not a ",
														),
													),
													factory.createTemplateSpan(
														factory.createIdentifier(
															"typeName",
														),
														factory.createTemplateTail(
															"",
															"",
														),
													),
												],
											),
											factory.createToken(
												ts.SyntaxKind.ColonToken,
											),
											factory.createTemplateExpression(
												factory.createTemplateHead(
													"",
													"",
												),
												[
													factory.createTemplateSpan(
														factory.createIdentifier(
															"argName",
														),
														factory.createTemplateTail(
															" has the wrong type",
															" has the wrong type",
														),
													),
												],
											),
										),
										factory.createPropertyAccessExpression(
											factory.createIdentifier(
												"ZWaveErrorCodes",
											),
											factory.createIdentifier(
												"Argument_Invalid",
											),
										),
									],
								),
							),
						],
						true,
					),
					undefined,
				),
			],
			true,
		),
	);
}

function createLocalAssertExpression(
	factory: ts.NodeFactory,
	argName: string,
	typeName: string,
	anonymousType: boolean,
): ts.ExpressionStatement {
	return factory.createExpressionStatement(
		factory.createCallExpression(
			factory.createIdentifier("__assertType"),
			undefined,
			[
				factory.createStringLiteral(argName),
				anonymousType
					? factory.createIdentifier("undefined")
					: factory.createStringLiteral(typeName),
				factory.createCallExpression(
					factory.createPropertyAccessExpression(
						factory.createIdentifier(`__assertType__${typeName}`),
						factory.createIdentifier("bind"),
					),
					undefined,
					[
						factory.createVoidExpression(
							factory.createNumericLiteral("0"),
						),
						factory.createIdentifier(argName),
					],
				),
			],
		),
	);
}

export function transformNode(
	node: ts.Node,
	visitorContext: FileSpecificVisitorContext,
): ts.Node {
	const f = visitorContext.factory;
	// if (
	// 	ts.isParameter(node) &&
	// 	node.type !== undefined &&
	// 	node.decorators !== undefined
	// ) {
	// 	const type = visitorContext.checker.getTypeFromTypeNode(node.type);
	// 	const required = !node.initializer && !node.questionToken;
	// 	const mappedDecorators = node.decorators.map((decorator) =>
	// 		transformDecorator(
	// 			decorator,
	// 			type,
	// 			extractVariableName(node.name),
	// 			!required,
	// 			visitorContext,
	// 		),
	// 	);
	// 	return f.updateParameterDeclaration(
	// 		node,
	// 		mappedDecorators,
	// 		node.modifiers,
	// 		node.dotDotDotToken,
	// 		node.name,
	// 		node.questionToken,
	// 		node.type,
	// 		node.initializer,
	// 	);
	if (ts.isMethodDeclaration(node) && node.decorators?.length) {
		// @validateArgs()
		const validateArgsDecorator = node.decorators.find((d) =>
			isValidateArgsDecorator(d, visitorContext),
		);
		if (validateArgsDecorator) {
			// This is a method which was decorated with @validateArgs
			return transformDecoratedMethod(
				node,
				validateArgsDecorator,
				visitorContext,
			);
		}
	} else if (ts.isCallExpression(node)) {
		// is(), createIs()
		const signature = visitorContext.checker.getResolvedSignature(node);
		if (
			signature !== undefined &&
			signature.declaration !== undefined &&
			VisitorUtils.getCanonicalPath(
				path.resolve(signature.declaration.getSourceFile().fileName),
				visitorContext,
			) ===
				path.resolve(path.join(__dirname, "../../build/index.d.ts")) &&
			node.typeArguments !== undefined &&
			node.typeArguments.length === 1
		) {
			// const name = visitorContext.checker.getTypeAtLocation(
			// 	signature.declaration,
			// ).symbol.name;
			const isAssert = false;
			// name === "assertType" || name === "createAssertType";
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
