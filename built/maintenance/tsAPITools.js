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
exports.hasComment = exports.getCommandClassFromClassDeclaration = exports.getCommandClassFromDecorator = exports.expressionToCommandClass = exports.loadTSConfig = exports.tsConfigFilePath = exports.repoRoot = exports.projectRoot = void 0;
const core_1 = require("@zwave-js/core");
const path = __importStar(require("path"));
const typescript_1 = __importDefault(require("typescript"));
// Find this project's root dir
exports.projectRoot = process.cwd();
exports.repoRoot = path.normalize(__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)));
/** Used for ts-morph */
exports.tsConfigFilePath = path.join(exports.repoRoot, "tsconfig.json");
function loadTSConfig(packageName = "", build = true) {
    const configFileName = typescript_1.default.findConfigFile(packageName ? path.join(exports.repoRoot, `packages/${packageName}`) : exports.repoRoot, 
    // eslint-disable-next-line @typescript-eslint/unbound-method
    typescript_1.default.sys.fileExists, build ? "tsconfig.build.json" : "tsconfig.json");
    if (!configFileName)
        throw new Error("tsconfig.json not found");
    const configFileText = typescript_1.default.sys.readFile(configFileName);
    if (!configFileText)
        throw new Error("could not read tsconfig.json");
    const parsedCommandLine = typescript_1.default.getParsedCommandLineOfConfigFile(configFileName, {}, typescript_1.default.sys);
    if (!parsedCommandLine)
        throw new Error("could not parse tsconfig.json");
    return {
        options: parsedCommandLine.options,
        fileNames: parsedCommandLine.fileNames,
    };
}
exports.loadTSConfig = loadTSConfig;
function expressionToCommandClass(sourceFile, enumExpr) {
    if ((!typescript_1.default.isPropertyAccessExpression(enumExpr) &&
        !typescript_1.default.isElementAccessExpression(enumExpr)) ||
        enumExpr.expression.getText(sourceFile) !== "CommandClasses")
        return;
    if (typescript_1.default.isPropertyAccessExpression(enumExpr)) {
        return core_1.CommandClasses[enumExpr.name.getText(sourceFile)];
    }
    else if (typescript_1.default.isElementAccessExpression(enumExpr) &&
        typescript_1.default.isStringLiteral(enumExpr.argumentExpression)) {
        return core_1.CommandClasses[enumExpr.argumentExpression
            .text];
    }
}
exports.expressionToCommandClass = expressionToCommandClass;
function getCommandClassFromDecorator(sourceFile, decorator) {
    if (!typescript_1.default.isCallExpression(decorator.expression))
        return;
    const decoratorName = decorator.expression.expression.getText(sourceFile);
    if ((decoratorName !== "commandClass" && decoratorName !== "API") ||
        decorator.expression.arguments.length !== 1)
        return;
    return expressionToCommandClass(sourceFile, decorator.expression.arguments[0]);
}
exports.getCommandClassFromDecorator = getCommandClassFromDecorator;
function getCommandClassFromClassDeclaration(sourceFile, node) {
    if (node.modifiers?.length) {
        for (const mod of node.modifiers) {
            if (!typescript_1.default.isDecorator(mod))
                continue;
            const ccId = getCommandClassFromDecorator(sourceFile, mod);
            if (ccId != undefined)
                return ccId;
        }
    }
}
exports.getCommandClassFromClassDeclaration = getCommandClassFromClassDeclaration;
function hasComment(sourceFile, node, predicate) {
    return (typescript_1.default
        .getLeadingCommentRanges(sourceFile.getFullText(), node.getFullStart())
        ?.some((r) => {
        const text = sourceFile.getFullText().slice(r.pos, r.end);
        return predicate(text, r.kind);
    }) ?? false);
}
exports.hasComment = hasComment;
//# sourceMappingURL=tsAPITools.js.map