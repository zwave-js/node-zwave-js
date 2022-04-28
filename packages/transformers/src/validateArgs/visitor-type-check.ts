import * as tsutils from "tsutils/typeguard/3.0";
import ts from "typescript";
import type { VisitorContext } from "./visitor-context";
import * as VisitorIndexedAccess from "./visitor-indexed-access";
import * as VisitorKeyof from "./visitor-keyof";
import * as VisitorTypeName from "./visitor-type-name";
import * as VisitorUtils from "./visitor-utils";

function visitDateType(type: ts.ObjectType, visitorContext: VisitorContext) {
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	const f = visitorContext.factory;
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		return f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					undefined,
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				f.createVariableStatement(
					undefined,
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								f.createIdentifier("nativeDateObject"),
								undefined,
								undefined,
							),
						],
						ts.NodeFlags.Let,
					),
				),
				f.createIfStatement(
					f.createBinaryExpression(
						f.createTypeOfExpression(f.createIdentifier("global")),
						f.createToken(ts.SyntaxKind.EqualsEqualsEqualsToken),
						f.createStringLiteral("undefined"),
					),
					f.createExpressionStatement(
						f.createBinaryExpression(
							f.createIdentifier("nativeDateObject"),
							f.createToken(ts.SyntaxKind.EqualsToken),
							f.createPropertyAccessExpression(
								f.createIdentifier("window"),
								f.createIdentifier("Date"),
							),
						),
					),
					f.createExpressionStatement(
						f.createBinaryExpression(
							f.createIdentifier("nativeDateObject"),
							f.createToken(ts.SyntaxKind.EqualsToken),
							f.createPropertyAccessExpression(
								f.createIdentifier("global"),
								f.createIdentifier("Date"),
							),
						),
					),
				),
				f.createIfStatement(
					f.createLogicalNot(
						f.createBinaryExpression(
							VisitorUtils.objectIdentifier,
							f.createToken(ts.SyntaxKind.InstanceOfKeyword),
							f.createIdentifier("nativeDateObject"),
						),
					),
					f.createReturnStatement(
						VisitorUtils.createErrorObject(
							{ type: "date" },
							visitorContext,
						),
					),
					f.createReturnStatement(f.createNull()),
				),
			]),
		);
	});
}

function visitBufferType(type: ts.ObjectType, visitorContext: VisitorContext) {
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	const f = visitorContext.factory;
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		return VisitorUtils.createAssertionFunction(
			f.createPrefixUnaryExpression(
				ts.SyntaxKind.ExclamationToken,
				f.createCallExpression(
					f.createPropertyAccessExpression(
						f.createIdentifier("Buffer"),
						f.createIdentifier("isBuffer"),
					),
					undefined,
					[VisitorUtils.objectIdentifier],
				),
			),
			{ type: "buffer" },
			name,
			visitorContext,
		);
	});
}

function visitClassType(type: ts.ObjectType, visitorContext: VisitorContext) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	const identifier = type.symbol.getName();

	// Figure out if something needs to be imported
	const typeSourceFileName =
		type.symbol.valueDeclaration?.getSourceFile().fileName;
	let importPath: string | undefined;
	if (
		typeSourceFileName &&
		typeSourceFileName !== visitorContext.sourceFile.fileName
	) {
		// We don't rely on the resolved path because the import specifier might refer to an absolute node_module
		importPath = VisitorUtils.resolveModuleSpecifierForType(
			type,
			visitorContext,
		);
		if (!importPath) {
			throw new Error(
				`Failed to resolve module specifier for type ${identifier}`,
			);
		}
	}

	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		return VisitorUtils.createAssertionFunction(
			// !(foo instanceof require("./bar").Foo)
			f.createPrefixUnaryExpression(
				ts.SyntaxKind.ExclamationToken,
				f.createParenthesizedExpression(
					f.createBinaryExpression(
						VisitorUtils.objectIdentifier,
						f.createToken(ts.SyntaxKind.InstanceOfKeyword),
						// Create an import for classes in other files
						importPath
							? f.createPropertyAccessExpression(
									f.createCallExpression(
										f.createIdentifier("require"),
										undefined,
										[f.createStringLiteral(importPath)],
									),
									f.createIdentifier(identifier),
							  )
							: f.createIdentifier(identifier),
					),
				),
			),
			{ type: "class", name: identifier },
			name,
			visitorContext,
		);
	});
}

function createRecursiveCall(
	functionName: string,
	functionArgument: ts.Expression,
	pathExpression: ts.Expression,
	visitorContext: VisitorContext,
): ts.Statement[] {
	const f = visitorContext.factory;
	const errorIdentifier = f.createIdentifier("error");
	const emitDetailedErrors = !!visitorContext.options.emitDetailedErrors;

	const statements: ts.Statement[] = [];
	if (emitDetailedErrors) {
		statements.push(
			f.createExpressionStatement(
				f.createCallExpression(
					f.createPropertyAccessExpression(
						VisitorUtils.pathIdentifier,
						"push",
					),
					undefined,
					[
						VisitorUtils.createBinaries(
							[pathExpression],
							ts.SyntaxKind.PlusToken,
						),
					],
				),
			),
		);
	}
	statements.push(
		f.createVariableStatement(
			undefined,
			f.createVariableDeclarationList(
				[
					f.createVariableDeclaration(
						errorIdentifier,
						undefined,
						undefined,
						f.createCallExpression(
							f.createIdentifier(functionName),
							undefined,
							[functionArgument],
						),
					),
				],
				ts.NodeFlags.Const,
			),
		),
	);
	if (emitDetailedErrors) {
		statements.push(
			f.createExpressionStatement(
				f.createCallExpression(
					f.createPropertyAccessExpression(
						VisitorUtils.pathIdentifier,
						"pop",
					),
					undefined,
					undefined,
				),
			),
		);
	}
	statements.push(
		f.createIfStatement(
			errorIdentifier,
			f.createReturnStatement(errorIdentifier),
		),
	);
	return statements;
}

function visitTupleObjectType(
	type: ts.TupleType,
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		const functionNames = type.typeArguments
			? type.typeArguments.map((type) => visitType(type, visitorContext))
			: [];

		const maxLength = functionNames.length;
		let minLength = functionNames.length;
		for (let i = 0; i < functionNames.length; i++) {
			const property = type.getProperty(i.toString());
			if (property && (property.flags & ts.SymbolFlags.Optional) !== 0) {
				minLength = i;
				break;
			}
		}

		return f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					undefined,
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
				f.createIfStatement(
					VisitorUtils.createBinaries(
						[
							f.createLogicalNot(
								f.createCallExpression(
									f.createPropertyAccessExpression(
										f.createIdentifier("Array"),
										"isArray",
									),
									undefined,
									[VisitorUtils.objectIdentifier],
								),
							),
							f.createBinaryExpression(
								f.createPropertyAccessExpression(
									VisitorUtils.objectIdentifier,
									"length",
								),
								ts.SyntaxKind.LessThanToken,
								f.createNumericLiteral(minLength.toString()),
							),
							f.createBinaryExpression(
								f.createNumericLiteral(maxLength.toString()),
								ts.SyntaxKind.LessThanToken,
								f.createPropertyAccessExpression(
									VisitorUtils.objectIdentifier,
									"length",
								),
							),
						],
						ts.SyntaxKind.BarBarToken,
					),
					f.createReturnStatement(
						VisitorUtils.createErrorObject(
							{ type: "tuple", minLength, maxLength },
							visitorContext,
						),
					),
				),
				...functionNames.map((functionName, index) =>
					VisitorUtils.createBlock(
						f,
						createRecursiveCall(
							functionName,
							f.createElementAccessExpression(
								VisitorUtils.objectIdentifier,
								index,
							),
							f.createStringLiteral(`[${index}]`),
							visitorContext,
						),
					),
				),
				f.createReturnStatement(f.createNull()),
			]),
		);
	});
}

function visitArrayObjectType(
	type: ts.ObjectType,
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		const numberIndexType = visitorContext.checker.getIndexTypeOfType(
			type,
			ts.IndexKind.Number,
		);
		if (numberIndexType === undefined) {
			throw new Error(
				"Expected array ObjectType to have a number index type.",
			);
		}
		const functionName = visitType(numberIndexType, visitorContext);
		const indexIdentifier = f.createIdentifier("i");

		return f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					undefined,
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
				f.createIfStatement(
					f.createLogicalNot(
						f.createCallExpression(
							f.createPropertyAccessExpression(
								f.createIdentifier("Array"),
								"isArray",
							),
							undefined,
							[VisitorUtils.objectIdentifier],
						),
					),
					f.createReturnStatement(
						VisitorUtils.createErrorObject(
							{ type: "array" },
							visitorContext,
						),
					),
				),
				f.createForStatement(
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								indexIdentifier,
								undefined,
								undefined,
								f.createNumericLiteral("0"),
							),
						],
						ts.NodeFlags.Let,
					),
					f.createBinaryExpression(
						indexIdentifier,
						ts.SyntaxKind.LessThanToken,
						f.createPropertyAccessExpression(
							VisitorUtils.objectIdentifier,
							"length",
						),
					),
					f.createPostfixIncrement(indexIdentifier),
					VisitorUtils.createBlock(
						f,
						createRecursiveCall(
							functionName,
							f.createElementAccessExpression(
								VisitorUtils.objectIdentifier,
								indexIdentifier,
							),
							VisitorUtils.createBinaries(
								[
									f.createStringLiteral("["),
									indexIdentifier,
									f.createStringLiteral("]"),
								],
								ts.SyntaxKind.PlusToken,
							),
							visitorContext,
						),
					),
				),
				f.createReturnStatement(f.createNull()),
			]),
		);
	});
}

function visitRegularObjectType(
	type: ts.ObjectType,
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		const propertyInfos = visitorContext.checker
			.getPropertiesOfType(type)
			.map((property) =>
				VisitorUtils.getPropertyInfo(type, property, visitorContext),
			);
		const stringIndexType = visitorContext.checker.getIndexTypeOfType(
			type,
			ts.IndexKind.String,
		);
		const stringIndexFunctionName = stringIndexType
			? visitType(stringIndexType, visitorContext)
			: undefined;
		const keyIdentifier = f.createIdentifier("key");
		return f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					undefined,
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
				f.createIfStatement(
					VisitorUtils.createBinaries(
						[
							f.createStrictInequality(
								f.createTypeOfExpression(
									VisitorUtils.objectIdentifier,
								),
								f.createStringLiteral("object"),
							),
							f.createStrictEquality(
								VisitorUtils.objectIdentifier,
								f.createNull(),
							),
							f.createCallExpression(
								f.createPropertyAccessExpression(
									f.createIdentifier("Array"),
									"isArray",
								),
								undefined,
								[VisitorUtils.objectIdentifier],
							),
						],
						ts.SyntaxKind.BarBarToken,
					),
					f.createReturnStatement(
						VisitorUtils.createErrorObject(
							{ type: "object" },
							visitorContext,
						),
					),
				),
				...propertyInfos
					.map((propertyInfo) => {
						if (propertyInfo.isSymbol) {
							return [];
						}
						const functionName =
							propertyInfo.isMethod || propertyInfo.isFunction
								? VisitorUtils.getIgnoredTypeFunction(
										visitorContext,
								  )
								: visitType(propertyInfo.type!, visitorContext);
						return [
							f.createIfStatement(
								f.createBinaryExpression(
									f.createBinaryExpression(
										f.createStringLiteral(
											propertyInfo.name,
										),
										ts.SyntaxKind.InKeyword,
										VisitorUtils.objectIdentifier,
									),
									f.createToken(
										ts.SyntaxKind.AmpersandAmpersandToken,
									),
									f.createBinaryExpression(
										f.createElementAccessExpression(
											VisitorUtils.objectIdentifier,
											f.createStringLiteral(
												propertyInfo.name,
											),
										),
										f.createToken(
											ts.SyntaxKind
												.ExclamationEqualsEqualsToken,
										),
										f.createIdentifier("undefined"),
									),
								),
								VisitorUtils.createBlock(
									f,
									createRecursiveCall(
										functionName,
										f.createElementAccessExpression(
											VisitorUtils.objectIdentifier,
											f.createStringLiteral(
												propertyInfo.name,
											),
										),
										f.createStringLiteral(
											propertyInfo.name,
										),
										visitorContext,
									),
								),
								propertyInfo.optional
									? undefined
									: f.createReturnStatement(
											VisitorUtils.createErrorObject(
												{
													type: "missing-property",
													property: propertyInfo.name,
												},
												visitorContext,
											),
									  ),
							),
						];
					})
					.reduce((a, b) => a.concat(b), []),
				...(stringIndexFunctionName
					? [
							f.createForOfStatement(
								undefined,
								f.createVariableDeclarationList(
									[
										f.createVariableDeclaration(
											keyIdentifier,
											undefined,
											undefined,
										),
									],
									ts.NodeFlags.Const,
								),
								f.createCallExpression(
									f.createPropertyAccessExpression(
										f.createIdentifier("Object"),
										"keys",
									),
									undefined,
									[VisitorUtils.objectIdentifier],
								),
								VisitorUtils.createBlock(
									f,
									createRecursiveCall(
										stringIndexFunctionName,
										f.createElementAccessExpression(
											VisitorUtils.objectIdentifier,
											keyIdentifier,
										),
										keyIdentifier,
										visitorContext,
									),
								),
							),
					  ]
					: []),
				f.createReturnStatement(f.createNull()),
			]),
		);
	});
}

function visitTypeAliasReference(
	type: ts.TypeReference,
	visitorContext: VisitorContext,
) {
	const mapping: Map<ts.Type, ts.Type> =
		VisitorUtils.getTypeAliasMapping(type);
	const previousTypeReference = visitorContext.previousTypeReference;
	visitorContext.typeMapperStack.push(mapping);
	visitorContext.previousTypeReference = type;
	const result = visitType(type, visitorContext);
	visitorContext.previousTypeReference = previousTypeReference;
	visitorContext.typeMapperStack.pop();
	return result;
}

function visitTypeReference(
	type: ts.TypeReference,
	visitorContext: VisitorContext,
) {
	const mapping: Map<ts.Type, ts.Type> = VisitorUtils.getTypeReferenceMapping(
		type,
		visitorContext,
	);
	const previousTypeReference = visitorContext.previousTypeReference;
	visitorContext.typeMapperStack.push(mapping);
	visitorContext.previousTypeReference = type;
	const result = visitType(type.target, visitorContext);
	visitorContext.previousTypeReference = previousTypeReference;
	visitorContext.typeMapperStack.pop();
	return result;
}

function visitTypeParameter(type: ts.Type, visitorContext: VisitorContext) {
	const mappedType = VisitorUtils.getResolvedTypeParameter(
		type,
		visitorContext,
	);
	if (mappedType === undefined) {
		throw new Error("Unbound type parameter, missing type node.");
	}
	return visitType(mappedType, visitorContext);
}

function visitObjectType(type: ts.ObjectType, visitorContext: VisitorContext) {
	if (VisitorUtils.checkIsClass(type, visitorContext)) {
		// Dates
		if (VisitorUtils.checkIsDateClass(type)) {
			return visitDateType(type, visitorContext);
		} else if (VisitorUtils.checkIsNodeBuffer(type)) {
			return visitBufferType(type, visitorContext);
		} else if (VisitorUtils.checkIsIgnoredIntrinsic(type)) {
			// This is an intrinsic type we can't check properly, so we just ignore it.
			return VisitorUtils.getIgnoredTypeFunction(visitorContext);
		} else {
			return visitClassType(type, visitorContext);
		}
	}
	if (tsutils.isTupleType(type)) {
		// Tuple with finite length.
		return visitTupleObjectType(type, visitorContext);
	} else if (
		visitorContext.checker.getIndexTypeOfType(type, ts.IndexKind.Number)
	) {
		// Index type is number -> array type.
		return visitArrayObjectType(type, visitorContext);
	} else if (
		"valueDeclaration" in type.symbol &&
		type.symbol.valueDeclaration &&
		(type.symbol.valueDeclaration.kind ===
			ts.SyntaxKind.MethodDeclaration ||
			type.symbol.valueDeclaration.kind === ts.SyntaxKind.FunctionType)
	) {
		return VisitorUtils.getIgnoredTypeFunction(visitorContext);
	} else if (
		type.symbol &&
		type.symbol.declarations &&
		type.symbol.declarations.length >= 1 &&
		ts.isFunctionTypeNode(type.symbol.declarations[0])
	) {
		return VisitorUtils.getIgnoredTypeFunction(visitorContext);
	} else {
		// Index type is string -> regular object type.
		return visitRegularObjectType(type, visitorContext);
	}
}

function visitLiteralType(
	type: ts.LiteralType,
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	if (typeof type.value === "string") {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		const value = type.value;
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createAssertionFunction(
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createStringLiteral(value),
				),
				{ type: "string-literal", value },
				name,
				visitorContext,
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
			);
		});
	} else if (typeof type.value === "number") {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		const value = type.value;
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createAssertionFunction(
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createNumericLiteral(value.toString()),
				),
				{ type: "number-literal", value },
				name,
				visitorContext,
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
			);
		});
	} else {
		throw new Error("Type value is expected to be a string or number.");
	}
}

function visitNumericEnumType(
	type: ts.UnionType & { types: ts.NumberLiteralType[] },
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	const identifier = type.symbol.getName();
	const enumValues = type.types.map((t: ts.NumberLiteralType) => t.value);

	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		return VisitorUtils.createAssertionFunction(
			// !([1,2,3].includes(foo))
			f.createPrefixUnaryExpression(
				ts.SyntaxKind.ExclamationToken,
				f.createCallExpression(
					f.createPropertyAccessExpression(
						f.createArrayLiteralExpression(
							enumValues.map((v) => f.createNumericLiteral(v)),
							false,
						),
						f.createIdentifier("includes"),
					),
					undefined,
					[VisitorUtils.objectIdentifier],
				),
			),
			{ type: "enum", name: identifier },
			name,
			visitorContext,
		);
	});

	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		return VisitorUtils.createAssertionFunction(
			f.createStrictInequality(
				VisitorUtils.objectIdentifier,
				f.createTrue(),
			),
			{ type: "boolean-literal", value: true },
			name,
			visitorContext,
			VisitorUtils.createStrictNullCheckStatement(
				VisitorUtils.objectIdentifier,
				visitorContext,
			),
		);
	});

	const typeUnion = type;
	if (tsutils.isUnionType(typeUnion)) {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		const functionNames = typeUnion.types.map((type) =>
			visitType(type, visitorContext),
		);
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createDisjunctionFunction(
				functionNames,
				name,
				visitorContext,
			);
		});
	}
	const intersectionType = type;
	if (tsutils.isIntersectionType(intersectionType)) {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			const functionNames = intersectionType.types.map((type) =>
				visitType(type, { ...visitorContext }),
			);
			return VisitorUtils.createConjunctionFunction(functionNames, name);
		});
	}
	throw new Error(
		"UnionOrIntersectionType type was neither a union nor an intersection.",
	);
}

function visitUnionOrIntersectionType(
	type: ts.UnionOrIntersectionType,
	visitorContext: VisitorContext,
) {
	const typeUnion = type;
	if (tsutils.isUnionType(typeUnion)) {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		const functionNames = typeUnion.types.map((type) =>
			visitType(type, visitorContext),
		);
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createDisjunctionFunction(
				functionNames,
				name,
				visitorContext,
			);
		});
	}
	const intersectionType = type;
	if (tsutils.isIntersectionType(intersectionType)) {
		const name = VisitorTypeName.visitType(type, visitorContext, {
			type: "type-check",
		});
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			const functionNames = intersectionType.types.map((type) =>
				visitType(type, { ...visitorContext }),
			);
			return VisitorUtils.createConjunctionFunction(functionNames, name);
		});
	}
	throw new Error(
		"UnionOrIntersectionType type was neither a union nor an intersection.",
	);
}

function visitBooleanLiteral(type: ts.Type, visitorContext: VisitorContext) {
	const intrinsicName = VisitorUtils.getIntrinsicName(type);
	const f = visitorContext.factory;
	if (intrinsicName === "true") {
		const name = "_true";
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createAssertionFunction(
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createTrue(),
				),
				{ type: "boolean-literal", value: true },
				name,
				visitorContext,
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
			);
		});
	} else if (intrinsicName === "false") {
		const name = "_false";
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			return VisitorUtils.createAssertionFunction(
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createFalse(),
				),
				{ type: "boolean-literal", value: false },
				name,
				visitorContext,
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
			);
		});
	} else {
		throw new Error(
			`Unsupported boolean literal with intrinsic name: ${intrinsicName}.`,
		);
	}
}

function visitNonPrimitiveType(type: ts.Type, visitorContext: VisitorContext) {
	const intrinsicName = VisitorUtils.getIntrinsicName(type);
	const f = visitorContext.factory;
	if (intrinsicName === "object") {
		const name = "_object";
		return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
			const conditions: ts.Expression[] = [
				f.createStrictInequality(
					f.createTypeOfExpression(VisitorUtils.objectIdentifier),
					f.createStringLiteral("boolean"),
				),
				f.createStrictInequality(
					f.createTypeOfExpression(VisitorUtils.objectIdentifier),
					f.createStringLiteral("number"),
				),
				f.createStrictInequality(
					f.createTypeOfExpression(VisitorUtils.objectIdentifier),
					f.createStringLiteral("string"),
				),
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createNull(),
				),
				f.createStrictInequality(
					VisitorUtils.objectIdentifier,
					f.createIdentifier("undefined"),
				),
			];
			const condition = VisitorUtils.createBinaries(
				conditions,
				ts.SyntaxKind.AmpersandAmpersandToken,
			);
			return VisitorUtils.createAssertionFunction(
				f.createLogicalNot(condition),
				{ type: "non-primitive" },
				name,
				visitorContext,
				VisitorUtils.createStrictNullCheckStatement(
					VisitorUtils.objectIdentifier,
					visitorContext,
				),
			);
		});
	} else {
		throw new Error(
			`Unsupported non-primitive with intrinsic name: ${intrinsicName}.`,
		);
	}
}

function visitAny(visitorContext: VisitorContext) {
	return VisitorUtils.getAnyFunction(visitorContext);
}

function visitUnknown(visitorContext: VisitorContext) {
	return VisitorUtils.getUnknownFunction(visitorContext);
}

function visitNever(visitorContext: VisitorContext) {
	return VisitorUtils.getNeverFunction(visitorContext);
}

function visitNull(visitorContext: VisitorContext) {
	return VisitorUtils.getNullFunction(visitorContext);
}

function visitUndefined(visitorContext: VisitorContext) {
	return VisitorUtils.getUndefinedFunction(visitorContext);
}

function visitNumber(visitorContext: VisitorContext) {
	return VisitorUtils.getNumberFunction(visitorContext);
}

function visitBigInt(visitorContext: VisitorContext) {
	return VisitorUtils.getBigIntFunction(visitorContext);
}

function visitBoolean(visitorContext: VisitorContext) {
	return VisitorUtils.getBooleanFunction(visitorContext);
}

function visitString(visitorContext: VisitorContext) {
	return VisitorUtils.getStringFunction(visitorContext);
}

function visitIndexType(type: ts.Type, visitorContext: VisitorContext) {
	// keyof T
	const indexedType = (type as { type?: ts.Type }).type;
	if (indexedType === undefined) {
		throw new Error("Could not get indexed type of index type.");
	}
	return VisitorKeyof.visitType(indexedType, visitorContext);
}

function visitIndexedAccessType(
	type: ts.IndexedAccessType,
	visitorContext: VisitorContext,
) {
	// T[U] -> index type = U, object type = T
	return VisitorIndexedAccess.visitType(
		type.objectType,
		type.indexType,
		visitorContext,
	);
}

function visitTemplateLiteralType(
	type: ts.TemplateLiteralType,
	visitorContext: VisitorContext,
) {
	const f = visitorContext.factory;
	const name = VisitorTypeName.visitType(type, visitorContext, {
		type: "type-check",
	});
	const typePairs = type.texts.reduce(
		(prev, curr, i: number) =>
			[
				...prev,
				[
					curr,
					typeof type.types[i] === "undefined"
						? undefined
						: VisitorUtils.getIntrinsicName(type.types[i]),
				],
			] as never,
		[] as VisitorUtils.TemplateLiteralPair[],
	);
	const templateLiteralTypeError = VisitorUtils.createErrorObject(
		{
			type: "template-literal",
			value: typePairs,
		},
		visitorContext,
	);
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () =>
		f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword),
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				f.createVariableStatement(
					undefined,
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								f.createIdentifier("typePairs"),
								undefined,
								undefined,
								f.createArrayLiteralExpression(
									typePairs.map(([text, type]) =>
										f.createArrayLiteralExpression([
											f.createStringLiteral(text),
											typeof type === "undefined"
												? f.createIdentifier(
														"undefined",
												  )
												: f.createStringLiteral(type),
										]),
									),
									false,
								),
							),
						],
						ts.NodeFlags.Const,
					),
				),
				f.createVariableStatement(
					undefined,
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								f.createIdentifier("position"),
								undefined,
								undefined,
								f.createNumericLiteral("0"),
							),
						],
						ts.NodeFlags.Let,
					),
				),
				f.createForOfStatement(
					undefined,
					f.createVariableDeclarationList(
						[
							f.createVariableDeclaration(
								f.createArrayBindingPattern([
									f.createBindingElement(
										undefined,
										undefined,
										f.createIdentifier("index"),
										undefined,
									),
									f.createBindingElement(
										undefined,
										undefined,
										f.createIdentifier("typePair"),
										undefined,
									),
								]),
								undefined,
								undefined,
								undefined,
							),
						],
						ts.NodeFlags.Const,
					),
					f.createCallExpression(
						f.createPropertyAccessExpression(
							f.createIdentifier("typePairs"),
							f.createIdentifier("entries"),
						),
						undefined,
						[],
					),
					VisitorUtils.createBlock(f, [
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										f.createArrayBindingPattern([
											f.createBindingElement(
												undefined,
												undefined,
												f.createIdentifier(
													"currentText",
												),
												undefined,
											),
											f.createBindingElement(
												undefined,
												undefined,
												f.createIdentifier(
													"currentType",
												),
												undefined,
											),
										]),
										undefined,
										undefined,
										f.createIdentifier("typePair"),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										f.createArrayBindingPattern([
											f.createBindingElement(
												undefined,
												undefined,
												f.createIdentifier("nextText"),
												undefined,
											),
											f.createBindingElement(
												undefined,
												undefined,
												f.createIdentifier("nextType"),
												undefined,
											),
										]),
										undefined,
										undefined,
										f.createBinaryExpression(
											f.createElementAccessExpression(
												f.createIdentifier("typePairs"),
												f.createBinaryExpression(
													f.createIdentifier("index"),
													f.createToken(
														ts.SyntaxKind.PlusToken,
													),
													f.createNumericLiteral("1"),
												),
											),
											f.createToken(
												ts.SyntaxKind
													.QuestionQuestionToken,
											),
											f.createArrayLiteralExpression(
												[
													f.createIdentifier(
														"undefined",
													),
													f.createIdentifier(
														"undefined",
													),
												],
												false,
											),
										),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						f.createIfStatement(
							f.createBinaryExpression(
								f.createCallExpression(
									f.createPropertyAccessExpression(
										VisitorUtils.objectIdentifier,
										f.createIdentifier("substr"),
									),
									undefined,
									[
										f.createIdentifier("position"),
										f.createPropertyAccessExpression(
											f.createIdentifier("currentText"),
											f.createIdentifier("length"),
										),
									],
								),
								f.createToken(
									ts.SyntaxKind.ExclamationEqualsEqualsToken,
								),
								f.createIdentifier("currentText"),
							),
							f.createReturnStatement(templateLiteralTypeError),
							undefined,
						),
						f.createExpressionStatement(
							f.createBinaryExpression(
								f.createIdentifier("position"),
								f.createToken(ts.SyntaxKind.PlusEqualsToken),
								f.createPropertyAccessExpression(
									f.createIdentifier("currentText"),
									f.createIdentifier("length"),
								),
							),
						),
						f.createIfStatement(
							f.createBinaryExpression(
								f.createBinaryExpression(
									f.createIdentifier("nextText"),
									f.createToken(
										ts.SyntaxKind.EqualsEqualsEqualsToken,
									),
									f.createStringLiteral(""),
								),
								f.createToken(
									ts.SyntaxKind.AmpersandAmpersandToken,
								),
								f.createBinaryExpression(
									f.createIdentifier("nextType"),
									f.createToken(
										ts.SyntaxKind
											.ExclamationEqualsEqualsToken,
									),
									f.createIdentifier("undefined"),
								),
							),
							VisitorUtils.createBlock(f, [
								f.createVariableStatement(
									undefined,
									f.createVariableDeclarationList(
										[
											f.createVariableDeclaration(
												f.createIdentifier("char"),
												undefined,
												undefined,
												f.createCallExpression(
													f.createPropertyAccessExpression(
														VisitorUtils.objectIdentifier,
														f.createIdentifier(
															"charAt",
														),
													),
													undefined,
													[
														f.createIdentifier(
															"position",
														),
													],
												),
											),
										],
										ts.NodeFlags.Const,
									),
								),
								f.createIfStatement(
									f.createBinaryExpression(
										f.createParenthesizedExpression(
											f.createBinaryExpression(
												f.createParenthesizedExpression(
													f.createBinaryExpression(
														f.createBinaryExpression(
															f.createIdentifier(
																"currentType",
															),
															f.createToken(
																ts.SyntaxKind
																	.EqualsEqualsEqualsToken,
															),
															f.createStringLiteral(
																"number",
															),
														),
														f.createToken(
															ts.SyntaxKind
																.BarBarToken,
														),
														f.createBinaryExpression(
															f.createIdentifier(
																"currentType",
															),
															f.createToken(
																ts.SyntaxKind
																	.EqualsEqualsEqualsToken,
															),
															f.createStringLiteral(
																"bigint",
															),
														),
													),
												),
												f.createToken(
													ts.SyntaxKind
														.AmpersandAmpersandToken,
												),
												f.createCallExpression(
													f.createIdentifier("isNaN"),
													undefined,
													[
														f.createCallExpression(
															f.createIdentifier(
																"Number",
															),
															undefined,
															[
																f.createIdentifier(
																	"char",
																),
															],
														),
													],
												),
											),
										),
										f.createToken(
											ts.SyntaxKind.BarBarToken,
										),
										f.createParenthesizedExpression(
											f.createBinaryExpression(
												f.createParenthesizedExpression(
													f.createBinaryExpression(
														f.createBinaryExpression(
															f.createIdentifier(
																"currentType",
															),
															f.createToken(
																ts.SyntaxKind
																	.EqualsEqualsEqualsToken,
															),
															f.createStringLiteral(
																"string",
															),
														),
														f.createToken(
															ts.SyntaxKind
																.BarBarToken,
														),
														f.createBinaryExpression(
															f.createIdentifier(
																"currentType",
															),
															f.createToken(
																ts.SyntaxKind
																	.EqualsEqualsEqualsToken,
															),
															f.createStringLiteral(
																"any",
															),
														),
													),
												),
												f.createToken(
													ts.SyntaxKind
														.AmpersandAmpersandToken,
												),
												f.createBinaryExpression(
													f.createIdentifier("char"),
													f.createToken(
														ts.SyntaxKind
															.EqualsEqualsEqualsToken,
													),
													f.createStringLiteral(""),
												),
											),
										),
									),
									f.createReturnStatement(
										templateLiteralTypeError,
									),
									undefined,
								),
							]),
							undefined,
						),
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										f.createIdentifier("nextTextOrType"),
										undefined,
										undefined,
										f.createConditionalExpression(
											f.createBinaryExpression(
												f.createIdentifier("nextText"),
												f.createToken(
													ts.SyntaxKind
														.EqualsEqualsEqualsToken,
												),
												f.createStringLiteral(""),
											),
											f.createToken(
												ts.SyntaxKind.QuestionToken,
											),
											f.createIdentifier("nextType"),
											f.createToken(
												ts.SyntaxKind.ColonToken,
											),
											f.createIdentifier("nextText"),
										),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										f.createIdentifier(
											"resolvedPlaceholder",
										),
										undefined,
										undefined,
										f.createCallExpression(
											f.createPropertyAccessExpression(
												VisitorUtils.objectIdentifier,
												f.createIdentifier("substring"),
											),
											undefined,
											[
												f.createIdentifier("position"),
												f.createConditionalExpression(
													f.createBinaryExpression(
														f.createTypeOfExpression(
															f.createIdentifier(
																"nextTextOrType",
															),
														),
														f.createToken(
															ts.SyntaxKind
																.EqualsEqualsEqualsToken,
														),
														f.createStringLiteral(
															"undefined",
														),
													),
													f.createToken(
														ts.SyntaxKind
															.QuestionToken,
													),
													f.createBinaryExpression(
														f.createPropertyAccessExpression(
															VisitorUtils.objectIdentifier,
															f.createIdentifier(
																"length",
															),
														),
														f.createToken(
															ts.SyntaxKind
																.MinusToken,
														),
														f.createNumericLiteral(
															"1",
														),
													),
													f.createToken(
														ts.SyntaxKind
															.ColonToken,
													),
													f.createCallExpression(
														f.createPropertyAccessExpression(
															VisitorUtils.objectIdentifier,
															f.createIdentifier(
																"indexOf",
															),
														),
														undefined,
														[
															f.createIdentifier(
																"nextTextOrType",
															),
															f.createIdentifier(
																"position",
															),
														],
													),
												),
											],
										),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						f.createIfStatement(
							f.createBinaryExpression(
								f.createBinaryExpression(
									f.createBinaryExpression(
										f.createParenthesizedExpression(
											f.createBinaryExpression(
												f.createBinaryExpression(
													f.createIdentifier(
														"currentType",
													),
													f.createToken(
														ts.SyntaxKind
															.EqualsEqualsEqualsToken,
													),
													f.createStringLiteral(
														"number",
													),
												),
												f.createToken(
													ts.SyntaxKind
														.AmpersandAmpersandToken,
												),
												f.createCallExpression(
													f.createIdentifier("isNaN"),
													undefined,
													[
														f.createCallExpression(
															f.createIdentifier(
																"Number",
															),
															undefined,
															[
																f.createIdentifier(
																	"resolvedPlaceholder",
																),
															],
														),
													],
												),
											),
										),
										f.createToken(
											ts.SyntaxKind.BarBarToken,
										),
										f.createParenthesizedExpression(
											f.createBinaryExpression(
												f.createBinaryExpression(
													f.createIdentifier(
														"currentType",
													),
													f.createToken(
														ts.SyntaxKind
															.EqualsEqualsEqualsToken,
													),
													f.createStringLiteral(
														"bigint",
													),
												),
												f.createToken(
													ts.SyntaxKind
														.AmpersandAmpersandToken,
												),
												f.createParenthesizedExpression(
													f.createBinaryExpression(
														f.createCallExpression(
															f.createPropertyAccessExpression(
																f.createIdentifier(
																	"resolvedPlaceholder",
																),
																f.createIdentifier(
																	"includes",
																),
															),
															undefined,
															[
																f.createStringLiteral(
																	".",
																),
															],
														),
														f.createToken(
															ts.SyntaxKind
																.BarBarToken,
														),
														f.createCallExpression(
															f.createIdentifier(
																"isNaN",
															),
															undefined,
															[
																f.createCallExpression(
																	f.createIdentifier(
																		"Number",
																	),
																	undefined,
																	[
																		f.createIdentifier(
																			"resolvedPlaceholder",
																		),
																	],
																),
															],
														),
													),
												),
											),
										),
									),
									f.createToken(ts.SyntaxKind.BarBarToken),
									f.createParenthesizedExpression(
										f.createBinaryExpression(
											f.createBinaryExpression(
												f.createIdentifier(
													"currentType",
												),
												f.createToken(
													ts.SyntaxKind
														.EqualsEqualsEqualsToken,
												),
												f.createStringLiteral(
													"undefined",
												),
											),
											f.createToken(
												ts.SyntaxKind
													.AmpersandAmpersandToken,
											),
											f.createBinaryExpression(
												f.createIdentifier(
													"resolvedPlaceholder",
												),
												f.createToken(
													ts.SyntaxKind
														.ExclamationEqualsEqualsToken,
												),
												f.createStringLiteral(
													"undefined",
												),
											),
										),
									),
								),
								f.createToken(ts.SyntaxKind.BarBarToken),
								f.createParenthesizedExpression(
									f.createBinaryExpression(
										f.createBinaryExpression(
											f.createIdentifier("currentType"),
											f.createToken(
												ts.SyntaxKind
													.EqualsEqualsEqualsToken,
											),
											f.createStringLiteral("null"),
										),
										f.createToken(
											ts.SyntaxKind
												.AmpersandAmpersandToken,
										),
										f.createBinaryExpression(
											f.createIdentifier(
												"resolvedPlaceholder",
											),
											f.createToken(
												ts.SyntaxKind
													.ExclamationEqualsEqualsToken,
											),
											f.createStringLiteral("null"),
										),
									),
								),
							),
							f.createReturnStatement(templateLiteralTypeError),
							undefined,
						),
						f.createExpressionStatement(
							f.createBinaryExpression(
								f.createIdentifier("position"),
								f.createToken(ts.SyntaxKind.PlusEqualsToken),
								f.createPropertyAccessExpression(
									f.createIdentifier("resolvedPlaceholder"),
									f.createIdentifier("length"),
								),
							),
						),
					]),
				),
				f.createReturnStatement(f.createNull()),
			]),
		),
	);
}

export function visitType(
	type: ts.Type,
	visitorContext: VisitorContext,
): string {
	if ((ts.TypeFlags.Any & type.flags) !== 0) {
		// Any
		return visitAny(visitorContext);
	} else if ((ts.TypeFlags.Unknown & type.flags) !== 0) {
		// Unknown
		return visitUnknown(visitorContext);
	} else if ((ts.TypeFlags.Never & type.flags) !== 0) {
		// Never
		return visitNever(visitorContext);
	} else if ((ts.TypeFlags.Null & type.flags) !== 0) {
		// Null
		return visitNull(visitorContext);
	} else if ((ts.TypeFlags.Undefined & type.flags) !== 0) {
		// Undefined
		return visitUndefined(visitorContext);
	} else if ((ts.TypeFlags.Number & type.flags) !== 0) {
		// Number
		return visitNumber(visitorContext);
	} else if (VisitorUtils.isBigIntType(type)) {
		// BigInt
		return visitBigInt(visitorContext);
	} else if ((ts.TypeFlags.Boolean & type.flags) !== 0) {
		// Boolean
		return visitBoolean(visitorContext);
	} else if ((ts.TypeFlags.String & type.flags) !== 0) {
		// String
		return visitString(visitorContext);
	} else if ((ts.TypeFlags.BooleanLiteral & type.flags) !== 0) {
		// Boolean literal (true/false)
		return visitBooleanLiteral(type, visitorContext);
	} else if (
		tsutils.isTypeReference(type) &&
		visitorContext.previousTypeReference !== type
	) {
		// Type references.
		return visitTypeReference(type, visitorContext);
	} else if (
		type.aliasTypeArguments &&
		visitorContext.previousTypeReference !== type &&
		(type as ts.TypeReference).target
	) {
		return visitTypeAliasReference(
			type as ts.TypeReference,
			visitorContext,
		);
	} else if ((ts.TypeFlags.TypeParameter & type.flags) !== 0) {
		// Type parameter
		return visitTypeParameter(type, visitorContext);
	} else if (tsutils.isObjectType(type)) {
		// Object type (including interfaces, arrays, tuples)
		return visitObjectType(type, visitorContext);
	} else if (tsutils.isLiteralType(type)) {
		// Literal string/number types ('foo')
		return visitLiteralType(type, visitorContext);
	} else if (VisitorUtils.isNumericEnum(type)) {
		// Enumeration with only numeric literal members
		return visitNumericEnumType(type, visitorContext);
	} else if (tsutils.isUnionOrIntersectionType(type)) {
		// Union or intersection type (| or &)
		return visitUnionOrIntersectionType(type, visitorContext);
	} else if ((ts.TypeFlags.NonPrimitive & type.flags) !== 0) {
		// Non-primitive such as object
		return visitNonPrimitiveType(type, visitorContext);
	} else if ((ts.TypeFlags.Index & type.flags) !== 0) {
		// Index type: keyof T
		return visitIndexType(type, visitorContext);
	} else if (tsutils.isIndexedAccessType(type)) {
		// Indexed access type: T[U]
		return visitIndexedAccessType(type, visitorContext);
	} else if ((ts.TypeFlags.TemplateLiteral & type.flags) !== 0) {
		// template literal type: `foo${string}`
		return visitTemplateLiteralType(
			type as ts.TemplateLiteralType,
			visitorContext,
		);
	} else {
		throw new Error(
			`Could not generate type-check; unsupported type with flags: ${type.flags}`,
		);
	}
}

export function visitUndefinedOrType(
	type: ts.Type,
	visitorContext: VisitorContext,
): string {
	const f = visitorContext.factory;
	const functionName = visitType(type, visitorContext);
	const name = `optional_${functionName}`;
	return VisitorUtils.setFunctionIfNotExists(name, visitorContext, () => {
		const errorIdentifier = f.createIdentifier("error");
		return f.createFunctionDeclaration(
			undefined,
			undefined,
			undefined,
			name,
			undefined,
			[
				f.createParameterDeclaration(
					undefined,
					undefined,
					undefined,
					VisitorUtils.objectIdentifier,
					undefined,
					undefined,
					undefined,
				),
			],
			undefined,
			VisitorUtils.createBlock(f, [
				f.createIfStatement(
					f.createStrictInequality(
						VisitorUtils.objectIdentifier,
						f.createIdentifier("undefined"),
					),
					VisitorUtils.createBlock(f, [
						f.createVariableStatement(
							undefined,
							f.createVariableDeclarationList(
								[
									f.createVariableDeclaration(
										errorIdentifier,
										undefined,
										undefined,
										f.createCallExpression(
											f.createIdentifier(functionName),
											undefined,
											[VisitorUtils.objectIdentifier],
										),
									),
								],
								ts.NodeFlags.Const,
							),
						),
						f.createIfStatement(
							errorIdentifier,
							f.createReturnStatement(errorIdentifier),
						),
					]),
				),
				f.createReturnStatement(f.createNull()),
			]),
		);
	});
}

export function visitShortCircuit(visitorContext: VisitorContext): string {
	return VisitorUtils.setFunctionIfNotExists(
		"shortCircuit",
		visitorContext,
		() => {
			return VisitorUtils.createAcceptingFunction("shortCircuit");
		},
	);
}
