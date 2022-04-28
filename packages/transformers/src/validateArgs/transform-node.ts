import * as path from "path";
import ts from "typescript";
import type { ValidateArgsOptions } from "..";
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
				undefined,
				f.createVariableDeclarationList(
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
					ts.NodeFlags.Const,
				),
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
		VisitorUtils.createBlock(f, [
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

function getValidateArgsOptions(
	decorator: ts.Decorator & { expression: ts.CallExpression },
): ValidateArgsOptions | undefined {
	if (decorator.expression.arguments.length !== 1) return;
	const options = decorator.expression.arguments[0];
	if (!ts.isObjectLiteralExpression(options)) return;
	const ret: ValidateArgsOptions = {};
	for (const prop of options.properties) {
		if (!ts.isPropertyAssignment(prop) || !ts.isIdentifier(prop.name))
			continue;
		switch (prop.name.escapedText) {
			case "strictEnums":
				if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
					ret.strictEnums = true;
				}
				break;
		}
	}
	return ret;
}

// /** Figures out an appropriate human-readable name for the variable designated by `node`. */
// function extractVariableName(node: ts.Node | undefined) {
// 	return node !== undefined && ts.isIdentifier(node)
// 		? node.escapedText.toString()
// 		: "$";
// }

function transformDecoratedMethod(
	method: ts.MethodDeclaration,
	validateArgsDecorator: ts.Decorator,
	visitorContext: FileSpecificVisitorContext,
	options?: ValidateArgsOptions,
) {
	// Remove the decorator and prepend its body with the validation code
	const f = visitorContext.factory;

	let body = method.body ?? f.createBlock([], true);
	const newStatements: ts.Statement[] = [];
	for (const param of method.parameters) {
		if (!param.type) continue;

		let typeName: string | undefined;
		let publicTypeName: string | undefined;
		let type = visitorContext.checker.getTypeFromTypeNode(param.type);
		let arrowFunction: ts.ArrowFunction;

		const optional = !!(param.initializer || param.questionToken);

		switch (param.type.kind) {
			case ts.SyntaxKind.NumberKeyword:
			case ts.SyntaxKind.StringKeyword:
			case ts.SyntaxKind.BooleanKeyword:
			case ts.SyntaxKind.BigIntKeyword:
			case ts.SyntaxKind.TypeReference:
				const hasTypeArguments =
					ts.isTypeReferenceNode(param.type) &&
					param.type.typeArguments;

				if (!hasTypeArguments) {
					// This is a type with an "easy" name we can factor out of the method body

					// Disable strict value checks for numeric enums
					if (
						VisitorUtils.isNumericEnum(type) &&
						!options?.strictEnums
					) {
						// Fake the number type
						type = { flags: ts.TypeFlags.Number } as ts.Type;
						publicTypeName = param.type.getText();
						typeName = "number";
					} else {
						publicTypeName = typeName = param.type.getText();
					}

					if (optional) {
						publicTypeName = `(optional) ${publicTypeName}`;
						typeName = `optional_${typeName}`;
					}

					arrowFunction = createArrowFunction(
						type,
						typeName,
						optional,
						{
							...visitorContext,
							options: {
								...visitorContext.options,
								emitDetailedErrors: false,
							},
						},
					);
				}

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

					typeName =
						(optional ? "optional_" : "") +
						visitType(type, typeContext);
					arrowFunction = createArrowFunction(
						type,
						typeName,
						optional,
						typeContext,
					);
				}

				const argName = (param.name as ts.Identifier).text;
				const assertion = createLocalAssertExpression(
					f,
					argName,
					typeName,
					publicTypeName,
				);
				if (!visitorContext.typeAssertions.has(typeName)) {
					visitorContext.typeAssertions.set(typeName, arrowFunction!);
				}
				newStatements.push(assertion);
		}
	}
	body = f.updateBlock(body, [...newStatements, ...body.statements]);
	const decorators = method.decorators?.filter(
		(d) => d !== validateArgsDecorator,
	);

	return f.updateMethodDeclaration(
		method,
		decorators && decorators.length > 0 ? decorators : undefined,
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
	publicTypeName: string | undefined,
): ts.ExpressionStatement {
	return factory.createExpressionStatement(
		factory.createCallExpression(
			factory.createIdentifier("__assertType"),
			undefined,
			[
				factory.createStringLiteral(argName),
				publicTypeName
					? factory.createStringLiteral(publicTypeName)
					: factory.createIdentifier("undefined"),
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
	if (ts.isMethodDeclaration(node) && node.decorators?.length) {
		// @validateArgs()
		const validateArgsDecorator = node.decorators.find(
			(d): d is ts.Decorator & { expression: ts.CallExpression } =>
				isValidateArgsDecorator(d, visitorContext),
		);
		if (validateArgsDecorator) {
			// This is a method which was decorated with @validateArgs
			return transformDecoratedMethod(
				node,
				validateArgsDecorator,
				visitorContext,
				getValidateArgsOptions(validateArgsDecorator),
			);
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
								VisitorUtils.createBlock(f, [
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
								]),
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
