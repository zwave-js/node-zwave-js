"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const typescript_1 = __importDefault(require("typescript"));
const transform_node_1 = require("./transform-node");
function getEmitDetailedErrors(options) {
    if (options) {
        if (options.emitDetailedErrors === "auto" ||
            typeof options.emitDetailedErrors === "boolean") {
            return options.emitDetailedErrors;
        }
    }
    return "auto";
}
function transformer(program, options) {
    if (options?.verbose) {
        console.log(`@zwave-js/transformer: transforming program with ${program.getSourceFiles().length} source files; using TypeScript ${typescript_1.default.version}.`);
    }
    const visitorContext = {
        program,
        checker: program.getTypeChecker(),
        compilerOptions: program.getCompilerOptions(),
        options: {
            shortCircuit: !!options?.shortCircuit,
            transformNonNullExpressions: !!options?.transformNonNullExpressions,
            emitDetailedErrors: getEmitDetailedErrors(options),
        },
        typeMapperStack: [],
        previousTypeReference: null,
        canonicalPaths: new Map(),
    };
    return (context) => (file) => {
        // Bail early if there is no import for "@zwave-js/transformers". In this case, there's nothing to transform
        if (file.getFullText().indexOf("@zwave-js/transformers") === -1) {
            if (options?.verbose) {
                console.log(`@zwave-js/transformers not imported in ${file.fileName}, skipping`);
            }
            return file;
        }
        const factory = context.factory;
        const fileVisitorContext = {
            ...visitorContext,
            factory,
            typeAssertions: new Map(),
            typeIdModuleMap: new Map(),
            sourceFile: file,
        };
        file = transformNodeAndChildren(file, program, context, fileVisitorContext);
        // Remove @zwave-js/transformers import
        const selfImports = file.statements
            .filter((s) => typescript_1.default.isImportDeclaration(s))
            .filter((i) => i.moduleSpecifier
            .getText(file)
            .replace(/^["']|["']$/g, "") ===
            "@zwave-js/transformers");
        if (selfImports.length > 0) {
            file = context.factory.updateSourceFile(file, file.statements.filter((s) => !selfImports.includes(s)), file.isDeclarationFile, file.referencedFiles, file.typeReferenceDirectives, file.hasNoDefaultLib, file.libReferenceDirectives);
        }
        // Add top-level declarations
        const newStatements = [];
        if (fileVisitorContext.typeAssertions.size > 0) {
            // Generic assert function used by all assertions
            newStatements.push((0, transform_node_1.createGenericAssertFunction)(factory));
            // And the individual "named" assertions
            for (const [typeName, assertion,] of fileVisitorContext.typeAssertions) {
                newStatements.push(factory.createVariableStatement(undefined, factory.createVariableDeclarationList([
                    factory.createVariableDeclaration(factory.createIdentifier(`__assertType__${typeName}`), undefined, undefined, assertion),
                ], typescript_1.default.NodeFlags.Const)));
            }
        }
        if (newStatements.length > 0) {
            file = context.factory.updateSourceFile(file, [...newStatements, ...file.statements], file.isDeclarationFile, file.referencedFiles, file.typeReferenceDirectives, file.hasNoDefaultLib, file.libReferenceDirectives);
        }
        return file;
    };
}
exports.default = transformer;
function transformNodeAndChildren(node, program, context, visitorContext) {
    let transformedNode;
    try {
        transformedNode = (0, transform_node_1.transformNode)(node, visitorContext);
    }
    catch (error) {
        const sourceFile = node.getSourceFile();
        const { line, character } = sourceFile.getLineAndCharacterOfPosition(node.pos);
        throw new Error(`Failed to transform node at: ${sourceFile.fileName}:${line + 1}:${character + 1}: ${error.stack}`);
    }
    return typescript_1.default.visitEachChild(transformedNode, (childNode) => transformNodeAndChildren(childNode, program, context, visitorContext), context);
}
//# sourceMappingURL=transformer.js.map