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
exports.transformNode = exports.createGenericAssertFunction = void 0;
const path = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const utils_1 = require("./utils");
const visitor_type_check_1 = require("./visitor-type-check");
const VisitorUtils = __importStar(require("./visitor-utils"));
const possibleDecoratorLocations = [
    path.resolve(path.join(__dirname, "../../build/index.d.ts")),
    path.resolve(path.join(__dirname, "../../src/index.ts")),
];
function createArrowFunction(type, rootName, optional, partialVisitorContext) {
    const functionMap = new Map();
    const functionNames = new Set();
    const typeIdMap = new Map();
    const visitorContext = {
        ...partialVisitorContext,
        functionNames,
        functionMap,
        typeIdMap,
    };
    const f = visitorContext.factory;
    const emitDetailedErrors = !!visitorContext.options.emitDetailedErrors;
    const functionName = partialVisitorContext.options.shortCircuit
        ? (0, visitor_type_check_1.visitShortCircuit)(visitorContext)
        : optional
            ? (0, visitor_type_check_1.visitUndefinedOrType)(type, visitorContext)
            : (0, visitor_type_check_1.visitType)(type, visitorContext);
    const variableDeclarations = [];
    if (emitDetailedErrors) {
        variableDeclarations.push(f.createVariableStatement(undefined, f.createVariableDeclarationList([
            f.createVariableDeclaration(VisitorUtils.pathIdentifier, undefined, undefined, f.createArrayLiteralExpression([
                f.createStringLiteral(rootName),
            ])),
        ], typescript_1.default.NodeFlags.Const)));
    }
    const functionDeclarations = (0, utils_1.sliceMapValues)(functionMap);
    return f.createArrowFunction(undefined, undefined, [
        f.createParameterDeclaration(undefined, undefined, VisitorUtils.objectIdentifier, undefined, f.createKeywordTypeNode(typescript_1.default.SyntaxKind.AnyKeyword)),
    ], undefined, undefined, VisitorUtils.createBlock(f, [
        ...variableDeclarations,
        ...functionDeclarations,
        f.createReturnStatement(f.createCallExpression(f.createIdentifier(functionName), undefined, [VisitorUtils.objectIdentifier])),
    ]));
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
function isValidateArgsDecorator(modifier, visitorContext) {
    if (!typescript_1.default.isDecorator(modifier))
        return false;
    if (typescript_1.default.isCallExpression(modifier.expression)) {
        const signature = visitorContext.checker.getResolvedSignature(modifier.expression);
        const decoratorName = modifier.expression.expression.getText(modifier.getSourceFile());
        // if (visitorContext.sourceFile.fileName.endsWith("test1.ts")) debugger;
        if (signature?.declaration && decoratorName === "validateArgs") {
            const resolvedPath = VisitorUtils.getCanonicalPath(path.resolve(signature.declaration.getSourceFile().fileName), visitorContext);
            if (possibleDecoratorLocations.includes(resolvedPath)) {
                return true;
            }
            console.log("found decorator with name validateArgs but not from the right file: ", resolvedPath);
        }
    }
    return false;
}
function getValidateArgsOptions(decorator) {
    if (decorator.expression.arguments.length !== 1)
        return;
    const options = decorator.expression.arguments[0];
    if (!typescript_1.default.isObjectLiteralExpression(options))
        return;
    const ret = {};
    for (const prop of options.properties) {
        if (!typescript_1.default.isPropertyAssignment(prop) || !typescript_1.default.isIdentifier(prop.name))
            continue;
        switch (prop.name.escapedText) {
            case "strictEnums":
                if (prop.initializer.kind === typescript_1.default.SyntaxKind.TrueKeyword) {
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
function transformDecoratedMethod(method, validateArgsDecorator, visitorContext, options) {
    // Remove the decorator and prepend its body with the validation code
    const f = visitorContext.factory;
    let body = method.body ?? f.createBlock([], true);
    const newStatements = [];
    for (const param of method.parameters) {
        if (!param.type)
            continue;
        let typeName;
        let publicTypeName;
        let type = visitorContext.checker.getTypeFromTypeNode(param.type);
        let arrowFunction;
        const optional = !!(param.initializer || param.questionToken);
        switch (param.type.kind) {
            case typescript_1.default.SyntaxKind.NumberKeyword:
            case typescript_1.default.SyntaxKind.StringKeyword:
            case typescript_1.default.SyntaxKind.BooleanKeyword:
            case typescript_1.default.SyntaxKind.BigIntKeyword:
            case typescript_1.default.SyntaxKind.TypeReference:
                const hasTypeArguments = typescript_1.default.isTypeReferenceNode(param.type) &&
                    param.type.typeArguments;
                if (!hasTypeArguments) {
                    // This is a type with an "easy" name we can factor out of the method body
                    // Disable strict value checks for numeric enums
                    if (VisitorUtils.isNumericEnum(type) &&
                        !options?.strictEnums) {
                        // Fake the number type
                        type = { flags: typescript_1.default.TypeFlags.Number };
                        publicTypeName = param.type.getText();
                        typeName = "number";
                    }
                    else {
                        publicTypeName = typeName = param.type.getText();
                    }
                    if (optional) {
                        publicTypeName = `(optional) ${publicTypeName}`;
                        typeName = `optional_${typeName}`;
                    }
                    arrowFunction = createArrowFunction(type, typeName, optional, {
                        ...visitorContext,
                        options: {
                            ...visitorContext.options,
                            emitDetailedErrors: false,
                        },
                    });
                }
            // Fall through
            default:
                // This is a type with a "complicated" name, we need to check within the function body
                if (!typeName) {
                    const typeContext = {
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
                            (0, visitor_type_check_1.visitType)(type, typeContext);
                    arrowFunction = createArrowFunction(type, typeName, optional, typeContext);
                }
                const argName = param.name.text;
                const assertion = createLocalAssertExpression(f, argName, typeName, publicTypeName);
                if (!visitorContext.typeAssertions.has(typeName)) {
                    visitorContext.typeAssertions.set(typeName, arrowFunction);
                }
                newStatements.push(assertion);
        }
    }
    body = f.updateBlock(body, [...newStatements, ...body.statements]);
    const modifiers = method.modifiers?.filter((m) => typescript_1.default.isModifier(m) ||
        (typescript_1.default.isDecorator(m) && m !== validateArgsDecorator));
    return f.updateMethodDeclaration(method, modifiers?.length ? modifiers : undefined, method.asteriskToken, method.name, method.questionToken, method.typeParameters, method.parameters, method.type, body);
}
function createGenericAssertFunction(factory) {
    // Generated with https://ts-ast-viewer.com
    return factory.createFunctionDeclaration(undefined, undefined, factory.createIdentifier("__assertType"), undefined, [
        factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier("argName"), undefined, factory.createKeywordTypeNode(typescript_1.default.SyntaxKind.StringKeyword)),
        factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier("typeName"), undefined, factory.createUnionTypeNode([
            factory.createKeywordTypeNode(typescript_1.default.SyntaxKind.StringKeyword),
            factory.createKeywordTypeNode(typescript_1.default.SyntaxKind.UndefinedKeyword),
        ])),
        factory.createParameterDeclaration(undefined, undefined, factory.createIdentifier("boundHasError"), undefined, factory.createFunctionTypeNode(undefined, [], factory.createKeywordTypeNode(typescript_1.default.SyntaxKind.BooleanKeyword))),
    ], undefined, factory.createBlock([
        // require the Error types here, so we don't depend on any potentially existing imports
        // Additionally, imports don't seem to be matched to the usage here, so we avoid further problems
        factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
            factory.createVariableDeclaration(factory.createObjectBindingPattern([
                factory.createBindingElement(undefined, undefined, factory.createIdentifier("ZWaveError"), undefined),
                factory.createBindingElement(undefined, undefined, factory.createIdentifier("ZWaveErrorCodes"), undefined),
            ]), undefined, undefined, factory.createCallExpression(factory.createIdentifier("require"), undefined, [
                factory.createStringLiteral("@zwave-js/core"),
            ])),
        ], typescript_1.default.NodeFlags.Const)),
        factory.createIfStatement(factory.createCallExpression(factory.createIdentifier("boundHasError"), undefined, []), factory.createBlock([
            factory.createThrowStatement(factory.createNewExpression(factory.createIdentifier("ZWaveError"), undefined, [
                factory.createConditionalExpression(factory.createIdentifier("typeName"), factory.createToken(typescript_1.default.SyntaxKind.QuestionToken), factory.createTemplateExpression(factory.createTemplateHead("", ""), [
                    factory.createTemplateSpan(factory.createIdentifier("argName"), factory.createTemplateMiddle(" is not a ", " is not a ")),
                    factory.createTemplateSpan(factory.createIdentifier("typeName"), factory.createTemplateTail("", "")),
                ]), factory.createToken(typescript_1.default.SyntaxKind.ColonToken), factory.createTemplateExpression(factory.createTemplateHead("", ""), [
                    factory.createTemplateSpan(factory.createIdentifier("argName"), factory.createTemplateTail(" has the wrong type", " has the wrong type")),
                ])),
                factory.createPropertyAccessExpression(factory.createIdentifier("ZWaveErrorCodes"), factory.createIdentifier("Argument_Invalid")),
            ])),
        ], true), undefined),
    ], true));
}
exports.createGenericAssertFunction = createGenericAssertFunction;
function createLocalAssertExpression(factory, argName, typeName, publicTypeName) {
    return factory.createExpressionStatement(factory.createCallExpression(factory.createIdentifier("__assertType"), undefined, [
        factory.createStringLiteral(argName),
        publicTypeName
            ? factory.createStringLiteral(publicTypeName)
            : factory.createIdentifier("undefined"),
        factory.createCallExpression(factory.createPropertyAccessExpression(factory.createIdentifier(`__assertType__${typeName}`), factory.createIdentifier("bind")), undefined, [
            factory.createVoidExpression(factory.createNumericLiteral("0")),
            factory.createIdentifier(argName),
        ]),
    ]));
}
function transformNode(node, visitorContext) {
    const f = visitorContext.factory;
    if (typescript_1.default.isMethodDeclaration(node) && node.modifiers?.length) {
        // @validateArgs()
        const validateArgsDecorator = node.modifiers.find((d) => isValidateArgsDecorator(d, visitorContext));
        if (validateArgsDecorator) {
            // This is a method which was decorated with @validateArgs
            return transformDecoratedMethod(node, validateArgsDecorator, visitorContext, getValidateArgsOptions(validateArgsDecorator));
        }
    }
    else if (visitorContext.options.transformNonNullExpressions &&
        typescript_1.default.isNonNullExpression(node)) {
        const expression = node.expression;
        return f.updateNonNullExpression(node, f.createParenthesizedExpression(f.createConditionalExpression(f.createParenthesizedExpression(f.createBinaryExpression(f.createBinaryExpression(f.createTypeOfExpression(expression), f.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), f.createStringLiteral("undefined")), f.createToken(typescript_1.default.SyntaxKind.BarBarToken), f.createBinaryExpression(expression, f.createToken(typescript_1.default.SyntaxKind.EqualsEqualsEqualsToken), f.createNull()))), f.createToken(typescript_1.default.SyntaxKind.QuestionToken), f.createCallExpression(f.createParenthesizedExpression(f.createArrowFunction(undefined, undefined, [], undefined, f.createToken(typescript_1.default.SyntaxKind.EqualsGreaterThanToken), VisitorUtils.createBlock(f, [
            f.createThrowStatement(f.createNewExpression(f.createIdentifier("Error"), undefined, [
                f.createTemplateExpression(f.createTemplateHead(`${expression.getText()} was non-null asserted but is `), [
                    f.createTemplateSpan(expression, f.createTemplateTail("")),
                ]),
            ])),
        ]))), undefined, []), f.createToken(typescript_1.default.SyntaxKind.ColonToken), expression)));
    }
    return node;
}
exports.transformNode = transformNode;
//# sourceMappingURL=transform-node.js.map