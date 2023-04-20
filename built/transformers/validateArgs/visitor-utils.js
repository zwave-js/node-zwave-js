"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveModuleSpecifierForType = exports.createBlock = exports.getCanonicalPath = exports.getIntrinsicName = exports.createErrorObject = exports.isBigIntType = exports.createSuperfluousPropertiesLoop = exports.createAssertionFunction = exports.createStrictNullCheckStatement = exports.createDisjunctionFunction = exports.createConjunctionFunction = exports.createAcceptingFunction = exports.createBinaries = exports.getIgnoredTypeFunction = exports.getAnyFunction = exports.getUnknownFunction = exports.getNeverFunction = exports.getNullFunction = exports.getUndefinedFunction = exports.getNumberFunction = exports.getBigIntFunction = exports.getBooleanFunction = exports.getStringFunction = exports.getFunctionFunction = exports.getResolvedTypeParameter = exports.getTypeReferenceMapping = exports.getTypeAliasMapping = exports.getPropertyInfo = exports.setFunctionIfNotExists = exports.isNumericEnum = exports.checkIsIgnoredIntrinsic = exports.checkIsNodeBuffer = exports.checkIsDateClass = exports.checkIsClass = exports.pathIdentifier = exports.objectIdentifier = void 0;
const fs = __importStar(require("fs"));
const tsutils = __importStar(require("tsutils/typeguard/3.0"));
const typescript_1 = __importDefault(require("typescript"));
exports.objectIdentifier = typescript_1.default.factory.createIdentifier("$o");
exports.pathIdentifier = typescript_1.default.factory.createIdentifier("path");
const keyIdentifier = typescript_1.default.factory.createIdentifier("key");
function checkIsClass(type, visitorContext) {
    // Hacky: using internal TypeScript API.
    if ("isArrayType" in visitorContext.checker &&
        visitorContext.checker.isArrayType(type)) {
        return false;
    }
    if ("isArrayLikeType" in visitorContext.checker &&
        visitorContext.checker.isArrayLikeType(type)) {
        return false;
    }
    let hasConstructSignatures = false;
    if (type.symbol !== undefined &&
        type.symbol.valueDeclaration !== undefined &&
        typescript_1.default.isVariableDeclaration(type.symbol.valueDeclaration) &&
        type.symbol.valueDeclaration.type) {
        const variableDeclarationType = visitorContext.checker.getTypeAtLocation(type.symbol.valueDeclaration.type);
        const constructSignatures = variableDeclarationType.getConstructSignatures();
        hasConstructSignatures = constructSignatures.length >= 1;
    }
    return type.isClass() || hasConstructSignatures;
}
exports.checkIsClass = checkIsClass;
function checkIsDateClass(type) {
    return (type.symbol !== undefined &&
        type.symbol.valueDeclaration !== undefined &&
        type.symbol.escapedName === "Date" &&
        !!(typescript_1.default.getCombinedModifierFlags(type.symbol.valueDeclaration) &
            typescript_1.default.ModifierFlags.Ambient));
}
exports.checkIsDateClass = checkIsDateClass;
function checkIsNodeBuffer(type) {
    return (type.symbol !== undefined &&
        type.symbol.valueDeclaration !== undefined &&
        type.symbol.escapedName === "Buffer" &&
        !!(typescript_1.default.getCombinedModifierFlags(type.symbol.valueDeclaration) &
            typescript_1.default.ModifierFlags.Ambient));
}
exports.checkIsNodeBuffer = checkIsNodeBuffer;
function checkIsIgnoredIntrinsic(type) {
    return (type.symbol !== undefined &&
        type.symbol.valueDeclaration !== undefined &&
        ["Set", "Map"].includes(type.symbol.name) &&
        !!(typescript_1.default.getCombinedModifierFlags(type.symbol.valueDeclaration) &
            typescript_1.default.ModifierFlags.Ambient));
}
exports.checkIsIgnoredIntrinsic = checkIsIgnoredIntrinsic;
function isNumericEnum(type) {
    return (!!(type.flags & typescript_1.default.TypeFlags.EnumLiteral) &&
        type.isUnion() &&
        type.types.every((t) => t.isNumberLiteral()));
}
exports.isNumericEnum = isNumericEnum;
function setFunctionIfNotExists(name, visitorContext, factory) {
    if (!visitorContext.functionNames.has(name)) {
        visitorContext.functionNames.add(name);
        visitorContext.functionMap.set(name, factory());
    }
    return name;
}
exports.setFunctionIfNotExists = setFunctionIfNotExists;
function getPropertyInfo(parentType, symbol, visitorContext) {
    const name = symbol.name;
    if (name === undefined) {
        throw new Error("Missing name in property symbol.");
    }
    let propertyType = undefined;
    let isMethod = undefined;
    let isFunction = undefined;
    let optional = undefined;
    if ("valueDeclaration" in symbol && symbol.valueDeclaration) {
        // Attempt to get it from 'valueDeclaration'
        const valueDeclaration = symbol.valueDeclaration;
        if (!typescript_1.default.isPropertySignature(valueDeclaration) &&
            !typescript_1.default.isMethodSignature(valueDeclaration)) {
            throw new Error(`Unsupported declaration kind: ${valueDeclaration.kind}`);
        }
        isMethod = typescript_1.default.isMethodSignature(valueDeclaration);
        isFunction =
            valueDeclaration.type !== undefined &&
                typescript_1.default.isFunctionTypeNode(valueDeclaration.type);
        if (valueDeclaration.type === undefined) {
            if (!isMethod) {
                throw new Error("Found property without type.");
            }
        }
        else {
            propertyType = visitorContext.checker.getTypeFromTypeNode(valueDeclaration.type);
        }
        optional = !!valueDeclaration.questionToken;
    }
    else if ("type" in symbol) {
        // Attempt to get it from 'type'
        propertyType = symbol.type;
        isMethod = false;
        isFunction = false;
        optional = (symbol.flags & typescript_1.default.SymbolFlags.Optional) !== 0;
    }
    else if ("getTypeOfPropertyOfType" in visitorContext.checker) {
        // Attempt to get it from 'visitorContext.checker.getTypeOfPropertyOfType'
        propertyType = visitorContext.checker.getTypeOfPropertyOfType(parentType, name);
        isMethod = false;
        isFunction = false;
        optional = (symbol.flags & typescript_1.default.SymbolFlags.Optional) !== 0;
    }
    if (optional !== undefined &&
        isMethod !== undefined &&
        isFunction !== undefined) {
        return {
            name,
            type: propertyType,
            isMethod,
            isFunction,
            isSymbol: name.startsWith("__@"),
            optional,
        };
    }
    throw new Error("Expected a valueDeclaration or a property type.");
}
exports.getPropertyInfo = getPropertyInfo;
function getTypeAliasMapping(type) {
    const mapping = new Map();
    if (type.aliasTypeArguments !== undefined &&
        type.target.aliasTypeArguments !== undefined) {
        const typeParameters = type.target.aliasTypeArguments;
        const typeArguments = type.aliasTypeArguments;
        for (let i = 0; i < typeParameters.length; i++) {
            if (typeParameters[i] !== typeArguments[i]) {
                mapping.set(typeParameters[i], typeArguments[i]);
            }
        }
    }
    return mapping;
}
exports.getTypeAliasMapping = getTypeAliasMapping;
function getTypeReferenceMapping(type, visitorContext) {
    const mapping = new Map();
    (function checkBaseTypes(type) {
        if (tsutils.isInterfaceType(type.target)) {
            const baseTypes = visitorContext.checker.getBaseTypes(type.target);
            for (const baseType of baseTypes) {
                if (baseType.aliasTypeArguments &&
                    visitorContext.previousTypeReference !== baseType &&
                    baseType.target) {
                    const typeReference = baseType;
                    if (typeReference.aliasTypeArguments !== undefined &&
                        typeReference.target.aliasTypeArguments !== undefined) {
                        const typeParameters = typeReference.target.aliasTypeArguments;
                        const typeArguments = typeReference.aliasTypeArguments;
                        for (let i = 0; i < typeParameters.length; i++) {
                            if (typeParameters[i] !== typeArguments[i]) {
                                mapping.set(typeParameters[i], typeArguments[i]);
                            }
                        }
                    }
                }
                if (tsutils.isTypeReference(baseType) &&
                    baseType.target.typeParameters !== undefined &&
                    baseType.typeArguments !== undefined) {
                    const typeParameters = baseType.target.typeParameters;
                    const typeArguments = baseType.typeArguments;
                    for (let i = 0; i < typeParameters.length; i++) {
                        if (typeParameters[i] !== typeArguments[i]) {
                            mapping.set(typeParameters[i], typeArguments[i]);
                        }
                    }
                    checkBaseTypes(baseType);
                }
            }
        }
    })(type);
    if (type.target.typeParameters !== undefined &&
        type.typeArguments !== undefined) {
        const typeParameters = type.target.typeParameters;
        const typeArguments = type.typeArguments;
        for (let i = 0; i < typeParameters.length; i++) {
            if (typeParameters[i] !== typeArguments[i]) {
                mapping.set(typeParameters[i], typeArguments[i]);
            }
        }
    }
    return mapping;
}
exports.getTypeReferenceMapping = getTypeReferenceMapping;
function getResolvedTypeParameter(type, visitorContext) {
    let mappedType;
    for (let i = visitorContext.typeMapperStack.length - 1; i >= 0; i--) {
        mappedType = visitorContext.typeMapperStack[i].get(type);
        if (mappedType !== undefined) {
            break;
        }
    }
    return mappedType || type.getDefault();
}
exports.getResolvedTypeParameter = getResolvedTypeParameter;
function getFunctionFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_function";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(f.createTypeOfExpression(exports.objectIdentifier), f.createStringLiteral("function")), { type: "function" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getFunctionFunction = getFunctionFunction;
function getStringFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_string";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(f.createTypeOfExpression(exports.objectIdentifier), f.createStringLiteral("string")), { type: "string" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getStringFunction = getStringFunction;
function getBooleanFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_boolean";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(f.createTypeOfExpression(exports.objectIdentifier), f.createStringLiteral("boolean")), { type: "boolean" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getBooleanFunction = getBooleanFunction;
function getBigIntFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_bigint";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(f.createTypeOfExpression(exports.objectIdentifier), f.createStringLiteral("bigint")), { type: "big-int" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getBigIntFunction = getBigIntFunction;
function getNumberFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_number";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(f.createTypeOfExpression(exports.objectIdentifier), f.createStringLiteral("number")), { type: "number" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getNumberFunction = getNumberFunction;
function getUndefinedFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_undefined";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAssertionFunction(f.createStrictInequality(exports.objectIdentifier, f.createIdentifier("undefined")), { type: "undefined" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getUndefinedFunction = getUndefinedFunction;
function getNullFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_null";
    return setFunctionIfNotExists(name, visitorContext, () => {
        const strictNullChecks = visitorContext.compilerOptions.strictNullChecks !== undefined
            ? visitorContext.compilerOptions.strictNullChecks
            : !!visitorContext.compilerOptions.strict;
        if (!strictNullChecks) {
            return createAcceptingFunction(name);
        }
        return createAssertionFunction(f.createStrictInequality(exports.objectIdentifier, f.createNull()), { type: "null" }, name, visitorContext, createStrictNullCheckStatement(exports.objectIdentifier, visitorContext));
    });
}
exports.getNullFunction = getNullFunction;
function getNeverFunction(visitorContext) {
    const f = visitorContext.factory;
    const name = "_never";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return f.createFunctionDeclaration(undefined, undefined, name, undefined, [
            f.createParameterDeclaration(undefined, undefined, exports.objectIdentifier, undefined, undefined, undefined),
        ], undefined, f.createBlock([
            f.createReturnStatement(createErrorObject({ type: "never" }, visitorContext)),
        ], true));
    });
}
exports.getNeverFunction = getNeverFunction;
function getUnknownFunction(visitorContext) {
    const name = "_unknown";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAcceptingFunction(name);
    });
}
exports.getUnknownFunction = getUnknownFunction;
function getAnyFunction(visitorContext) {
    const name = "_any";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAcceptingFunction(name);
    });
}
exports.getAnyFunction = getAnyFunction;
function getIgnoredTypeFunction(visitorContext) {
    const name = "_ignore";
    return setFunctionIfNotExists(name, visitorContext, () => {
        return createAcceptingFunction(name);
    });
}
exports.getIgnoredTypeFunction = getIgnoredTypeFunction;
function createBinaries(expressions, operator, baseExpression) {
    if (expressions.length >= 1 || baseExpression === undefined) {
        return expressions.reduce((previous, expression) => typescript_1.default.factory.createBinaryExpression(previous, operator, expression));
    }
    else {
        return baseExpression;
    }
}
exports.createBinaries = createBinaries;
function createAcceptingFunction(functionName) {
    return typescript_1.default.factory.createFunctionDeclaration(undefined, undefined, functionName, undefined, [], undefined, typescript_1.default.factory.createBlock([typescript_1.default.factory.createReturnStatement(typescript_1.default.factory.createNull())], true));
}
exports.createAcceptingFunction = createAcceptingFunction;
function createConjunctionFunction(functionNames, functionName, extraStatements) {
    const conditionsIdentifier = typescript_1.default.factory.createIdentifier("conditions");
    const conditionIdentifier = typescript_1.default.factory.createIdentifier("condition");
    const errorIdentifier = typescript_1.default.factory.createIdentifier("error");
    return typescript_1.default.factory.createFunctionDeclaration(undefined, undefined, functionName, undefined, [
        typescript_1.default.factory.createParameterDeclaration(undefined, undefined, exports.objectIdentifier, undefined, undefined, undefined),
    ], undefined, typescript_1.default.factory.createBlock([
        typescript_1.default.factory.createVariableStatement(undefined, typescript_1.default.factory.createVariableDeclarationList([
            typescript_1.default.factory.createVariableDeclaration(conditionsIdentifier, undefined, undefined, typescript_1.default.factory.createArrayLiteralExpression(functionNames.map((functionName) => typescript_1.default.factory.createIdentifier(functionName)))),
        ], typescript_1.default.NodeFlags.Const)),
        typescript_1.default.factory.createForOfStatement(undefined, typescript_1.default.factory.createVariableDeclarationList([
            typescript_1.default.factory.createVariableDeclaration(conditionIdentifier, undefined, undefined),
        ], typescript_1.default.NodeFlags.Const), conditionsIdentifier, typescript_1.default.factory.createBlock([
            typescript_1.default.factory.createVariableStatement(undefined, typescript_1.default.factory.createVariableDeclarationList([
                typescript_1.default.factory.createVariableDeclaration(errorIdentifier, undefined, undefined, typescript_1.default.factory.createCallExpression(conditionIdentifier, undefined, [exports.objectIdentifier])),
            ], typescript_1.default.NodeFlags.Const)),
            typescript_1.default.factory.createIfStatement(errorIdentifier, typescript_1.default.factory.createReturnStatement(errorIdentifier)),
        ], true)),
        ...(extraStatements || []),
        typescript_1.default.factory.createReturnStatement(typescript_1.default.factory.createNull()),
    ], true));
}
exports.createConjunctionFunction = createConjunctionFunction;
function createDisjunctionFunction(functionNames, functionName, visitorContext) {
    const f = visitorContext.factory;
    // Not sure why this was here. It created spurious uncalled _null methods
    //
    // if (functionNames.length === 2) {
    // 	const nullTypeCheckFunction = getNullFunction(visitorContext);
    // 	const nullIndex = functionNames.indexOf(nullTypeCheckFunction);
    // 	if (nullIndex > -1) {
    // 		return createNullableTypeCheck(
    // 			functionNames[1 - nullIndex],
    // 			functionName,
    // 		);
    // 	}
    // }
    const conditionsIdentifier = f.createIdentifier("conditions");
    const conditionIdentifier = f.createIdentifier("condition");
    const errorIdentifier = f.createIdentifier("error");
    return f.createFunctionDeclaration(undefined, undefined, functionName, undefined, [
        f.createParameterDeclaration(undefined, undefined, exports.objectIdentifier, undefined, undefined, undefined),
    ], undefined, f.createBlock([
        f.createVariableStatement(undefined, f.createVariableDeclarationList([
            f.createVariableDeclaration(conditionsIdentifier, undefined, undefined, f.createArrayLiteralExpression(functionNames.map((functionName) => f.createIdentifier(functionName)))),
        ], typescript_1.default.NodeFlags.Const)),
        f.createForOfStatement(undefined, f.createVariableDeclarationList([
            f.createVariableDeclaration(conditionIdentifier, undefined, undefined),
        ], typescript_1.default.NodeFlags.Const), conditionsIdentifier, f.createBlock([
            f.createVariableStatement(undefined, f.createVariableDeclarationList([
                f.createVariableDeclaration(errorIdentifier, undefined, undefined, f.createCallExpression(conditionIdentifier, undefined, [exports.objectIdentifier])),
            ], typescript_1.default.NodeFlags.Const)),
            f.createIfStatement(f.createLogicalNot(errorIdentifier), f.createReturnStatement(f.createNull())),
        ], true)),
        f.createReturnStatement(createErrorObject({ type: "union" }, visitorContext)),
    ], true));
}
exports.createDisjunctionFunction = createDisjunctionFunction;
// function createNullableTypeCheck(
// 	typeCheckFunction: string,
// 	functionName: string,
// ) {
// 	return ts.createFunctionDeclaration(
// 		undefined,
// 		undefined,
// 		undefined,
// 		functionName,
// 		undefined,
// 		[
// 			ts.createParameter(
// 				undefined,
// 				undefined,
// 				undefined,
// 				objectIdentifier,
// 				undefined,
// 				undefined,
// 				undefined,
// 			),
// 		],
// 		undefined,
// 		ts.createBlock(
// 			[
// 				ts.createIf(
// 					ts.createStrictEquality(objectIdentifier, ts.createNull()),
// 					ts.createReturn(ts.createNull()),
// 					ts.createReturn(
// 						ts.createCall(
// 							ts.createIdentifier(typeCheckFunction),
// 							undefined,
// 							[objectIdentifier],
// 						),
// 					),
// 				),
// 			],
// 			true,
// 		),
// 	);
// }
function createStrictNullCheckStatement(identifier, visitorContext) {
    const f = visitorContext.factory;
    if (visitorContext.compilerOptions.strictNullChecks !== false) {
        return f.createEmptyStatement();
    }
    else {
        return f.createIfStatement(f.createBinaryExpression(f.createStrictEquality(identifier, f.createNull()), typescript_1.default.SyntaxKind.BarBarToken, f.createStrictEquality(identifier, f.createIdentifier("undefined"))), f.createReturnStatement(f.createNull()));
    }
}
exports.createStrictNullCheckStatement = createStrictNullCheckStatement;
function createAssertionFunction(failureCondition, expected, functionName, visitorContext, ...otherStatements) {
    const f = visitorContext.factory;
    return f.createFunctionDeclaration(undefined, undefined, functionName, undefined, [
        f.createParameterDeclaration(undefined, undefined, exports.objectIdentifier, undefined, undefined, undefined),
    ], undefined, f.createBlock([
        ...otherStatements.filter((o) => !typescript_1.default.isEmptyStatement(o)),
        f.createReturnStatement(f.createConditionalExpression(failureCondition, f.createToken(typescript_1.default.SyntaxKind.QuestionToken), createErrorObject(expected, visitorContext), f.createToken(typescript_1.default.SyntaxKind.ColonToken), f.createNull())),
    ], true));
}
exports.createAssertionFunction = createAssertionFunction;
function createSuperfluousPropertiesLoop(propertyNames, visitorContext) {
    const f = visitorContext.factory;
    return f.createForOfStatement(undefined, f.createVariableDeclarationList([f.createVariableDeclaration(keyIdentifier, undefined, undefined)], typescript_1.default.NodeFlags.Const), f.createCallExpression(f.createPropertyAccessExpression(f.createIdentifier("Object"), "keys"), undefined, [exports.objectIdentifier]), f.createBlock([
        f.createIfStatement(createBinaries(propertyNames.map((propertyName) => f.createStrictInequality(keyIdentifier, f.createStringLiteral(propertyName))), typescript_1.default.SyntaxKind.AmpersandAmpersandToken, f.createTrue()), f.createReturnStatement(createErrorObject({ type: "superfluous-property" }, visitorContext))),
    ], true));
}
exports.createSuperfluousPropertiesLoop = createSuperfluousPropertiesLoop;
function isBigIntType(type) {
    if ("BigInt" in typescript_1.default.TypeFlags) {
        return !!(typescript_1.default.TypeFlags.BigInt & type.flags);
    }
    else {
        return false;
    }
}
exports.isBigIntType = isBigIntType;
function createAssertionString(reason) {
    if (typeof reason === "string") {
        return createBinaries([
            typescript_1.default.factory.createStringLiteral("validation failed at "),
            typescript_1.default.factory.createCallExpression(typescript_1.default.factory.createPropertyAccessExpression(exports.pathIdentifier, "join"), undefined, [typescript_1.default.factory.createStringLiteral(".")]),
            typescript_1.default.factory.createStringLiteral(`: ${reason}`),
        ], typescript_1.default.SyntaxKind.PlusToken);
    }
    else {
        return createBinaries([
            typescript_1.default.factory.createStringLiteral("validation failed at "),
            typescript_1.default.factory.createCallExpression(typescript_1.default.factory.createPropertyAccessExpression(exports.pathIdentifier, "join"), undefined, [typescript_1.default.factory.createStringLiteral(".")]),
            typescript_1.default.factory.createStringLiteral(`: `),
            reason,
        ], typescript_1.default.SyntaxKind.PlusToken);
    }
}
function createErrorObject(reason, visitorContext) {
    const f = visitorContext.factory;
    if (visitorContext.options.emitDetailedErrors === false) {
        return f.createObjectLiteralExpression([]);
    }
    return f.createObjectLiteralExpression([
        f.createPropertyAssignment("message", createErrorMessage(reason)),
        f.createPropertyAssignment("path", f.createCallExpression(f.createPropertyAccessExpression(exports.pathIdentifier, "slice"), undefined, undefined)),
        f.createPropertyAssignment("reason", serializeObjectToExpression(reason)),
    ]);
}
exports.createErrorObject = createErrorObject;
function serializeObjectToExpression(object) {
    if (typeof object === "string") {
        return typescript_1.default.factory.createStringLiteral(object);
    }
    else if (typeof object === "number") {
        return typescript_1.default.factory.createNumericLiteral(object.toString());
    }
    else if (typeof object === "boolean") {
        return object ? typescript_1.default.factory.createTrue() : typescript_1.default.factory.createFalse();
    }
    else if (typeof object === "bigint") {
        return typescript_1.default.factory.createBigIntLiteral(object.toString());
    }
    else if (typeof object === "undefined") {
        return typescript_1.default.factory.createIdentifier("undefined");
    }
    else if (typeof object === "object") {
        if (object === null) {
            return typescript_1.default.factory.createNull();
        }
        else if (Array.isArray(object)) {
            return typescript_1.default.factory.createArrayLiteralExpression(object.map((item) => serializeObjectToExpression(item)));
        }
        else {
            return typescript_1.default.factory.createObjectLiteralExpression(Object.keys(object).map((key) => {
                const value = object[key];
                return typescript_1.default.factory.createPropertyAssignment(key, serializeObjectToExpression(value));
            }));
        }
    }
    throw new Error("Cannot serialize object to expression.");
}
function createErrorMessage(reason) {
    switch (reason.type) {
        case "tuple":
            return createAssertionString(`expected an array with length ${reason.minLength}-${reason.maxLength}`);
        case "array":
            return createAssertionString("expected an array");
        case "object":
            return createAssertionString("expected an object");
        case "missing-property":
            return createAssertionString(`expected '${reason.property}' in object`);
        case "superfluous-property":
            return createAssertionString(createBinaries([
                typescript_1.default.factory.createStringLiteral(`superfluous property '`),
                keyIdentifier,
                typescript_1.default.factory.createStringLiteral(`' in object`),
            ], typescript_1.default.SyntaxKind.PlusToken));
        case "never":
            return createAssertionString("type is never");
        case "union":
            return createAssertionString("there are no valid alternatives");
        case "string":
            return createAssertionString("expected a string");
        case "boolean":
            return createAssertionString("expected a boolean");
        case "big-int":
            return createAssertionString("expected a bigint");
        case "number":
            return createAssertionString("expected a number");
        case "undefined":
            return createAssertionString("expected undefined");
        case "null":
            return createAssertionString("expected null");
        case "object-keyof":
            return createAssertionString(`expected ${reason.properties
                .map((property) => `'${property}'`)
                .join("|")}`);
        case "string-literal":
            return createAssertionString(`expected string '${reason.value}'`);
        case "number-literal":
            return createAssertionString(`expected number '${reason.value}'`);
        case "boolean-literal":
            return createAssertionString(`expected ${reason.value ? "true" : "false"}`);
        case "non-primitive":
            return createAssertionString("expected a non-primitive");
        case "date":
            return createAssertionString("expected a Date");
        case "buffer":
            return createAssertionString("expected a Buffer");
        case "class":
            return createAssertionString(`expected instance of class '${reason.name}'`);
        case "enum":
            return createAssertionString(`expected value from enum '${reason.name}'`);
        case "function":
            return createAssertionString("expected a function");
        case "template-literal":
            return createAssertionString(`expected \`${reason.value
                .map(([text, type]) => text +
                (typeof type === "undefined"
                    ? ""
                    : "${" + type + "}"))
                .join("")}\``);
    }
    throw new Error("Not implemented");
}
function getIntrinsicName(type) {
    // Using internal TypeScript API, hacky.
    return type.intrinsicName;
}
exports.getIntrinsicName = getIntrinsicName;
function getCanonicalPath(path, context) {
    if (!context.canonicalPaths.has(path)) {
        context.canonicalPaths.set(path, fs.realpathSync(path));
    }
    return context.canonicalPaths.get(path);
}
exports.getCanonicalPath = getCanonicalPath;
function createBlock(factory, statements) {
    return factory.createBlock(statements.filter((s) => !typescript_1.default.isEmptyStatement(s)), true);
}
exports.createBlock = createBlock;
function resolveModuleSpecifierForType(type, visitorContext) {
    // @ts-expect-error We're using TS internals here
    const typeId = type.id;
    // Prefer cached resolutions
    if (visitorContext.typeIdModuleMap.has(typeId)) {
        return visitorContext.typeIdModuleMap.get(typeId);
    }
    // Otherwise scan all imports to determine which one resolves to the same type
    const importDeclarations = visitorContext.sourceFile.statements.filter((n) => typescript_1.default.isImportDeclaration(n));
    for (const imp of importDeclarations) {
        if (!imp.importClause?.namedBindings)
            continue;
        if (!typescript_1.default.isNamedImports(imp.importClause.namedBindings))
            continue;
        // Remember where each type was imported from
        const specifier = imp.moduleSpecifier.text;
        for (const e of imp.importClause.namedBindings.elements) {
            const symbol = visitorContext.checker.getSymbolAtLocation(e.name);
            if (!symbol)
                continue;
            const type = visitorContext.checker.getDeclaredTypeOfSymbol(symbol);
            if (!type)
                continue;
            // @ts-expect-error We're using TS internals here
            const id = type.id;
            if (!visitorContext.typeIdModuleMap.has(id)) {
                visitorContext.typeIdModuleMap.set(id, specifier);
            }
            if (id === typeId)
                return specifier;
        }
    }
}
exports.resolveModuleSpecifierForType = resolveModuleSpecifierForType;
//# sourceMappingURL=visitor-utils.js.map