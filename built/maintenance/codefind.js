"use strict";
/*!
 * This scripts ensures that files annotated with @noExternalImports don't import
 * anything from outside the monorepo.
 */
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
exports.codefind = void 0;
const ansi_colors_1 = require("ansi-colors");
const cli_highlight_1 = __importStar(require("cli-highlight"));
const globrex_1 = __importDefault(require("globrex"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
const yargs_1 = __importDefault(require("yargs"));
const tsAPITools_1 = require("./tsAPITools");
function relativeToProject(filename) {
    return path_1.default.relative(tsAPITools_1.projectRoot, filename).replace(/\\/g, "/");
}
const highlightTheme = (0, cli_highlight_1.fromJson)({
    keyword: "blue",
    // function: ["yellow", "dim"],
    built_in: ["cyan", "dim"],
    string: "red",
    type: ["cyan"],
    comment: ["green", "dim"],
    class: ["green"],
    // default: "gray",
});
function formatResult(sourceFile, result, additionalLines = 3) {
    const ret = {
        ...result,
        formatted: "",
    };
    let source = sourceFile.text;
    // Remember the leading tabs for each line
    const leadingTabs = source
        .split("\n")
        .map((line) => line.match(/^\t*/)?.[0]?.length ?? 0);
    // Then replace them with 4 spaces for formatting
    source = source
        .split("\n")
        .map((line, i) => line.replace(/^\t*/, "    ".repeat(leadingTabs[i])))
        .join("\n");
    let formattedSourceLines = (0, cli_highlight_1.default)(source, {
        language: "typescript",
        theme: highlightTheme,
    }).split("\n");
    const lineIndicatorLength = Math.ceil(Math.log10(formattedSourceLines.length));
    formattedSourceLines = formattedSourceLines.map((line, i) => {
        let ret = line;
        if (i === result.line)
            ret = (0, ansi_colors_1.bold)(ret);
        const prefix = `${i + 1}`.padStart(lineIndicatorLength);
        if (i === result.line) {
            ret = `${(0, ansi_colors_1.bold)((0, ansi_colors_1.greenBright)(prefix))} | ${ret}`;
            ret +=
                "\n" +
                    " ".repeat(prefix.length) +
                    " | " +
                    // Leading tabs are counted as a single character by TS, but we want to
                    // display them as 4 spaces. This means we need to offset the column number
                    // by 3 times the no. of tabs.
                    " ".repeat(3 * leadingTabs[i] + result.character) +
                    (0, ansi_colors_1.bold)((0, ansi_colors_1.greenBright)("^".repeat(result.match.length)));
        }
        else {
            ret = `${(0, ansi_colors_1.gray)(prefix)} | ${ret}`;
        }
        return ret;
    });
    const startLine = Math.max(0, result.line - additionalLines);
    const endLine = Math.min(formattedSourceLines.length, result.line + 1 + additionalLines);
    ret.formatted = formattedSourceLines.slice(startLine, endLine).join("\n");
    return ret;
}
function getNodeName(sourceFile, node) {
    if (typescript_1.default.isVariableDeclaration(node) &&
        typescript_1.default.isIdentifier(node.name) &&
        node.initializer &&
        (typescript_1.default.isArrowFunction(node.initializer) ||
            typescript_1.default.isFunctionExpression(node.initializer) ||
            typescript_1.default.isClassExpression(node.initializer)) &&
        !node.initializer.name) {
        // const foo = function() { ... }
        // const foo = () => { ... }
        // const foo = class { ... }
        return node.name?.getText(sourceFile);
    }
    else if ((typescript_1.default.isFunctionDeclaration(node) ||
        typescript_1.default.isFunctionExpression(node) ||
        typescript_1.default.isMethodDeclaration(node) ||
        typescript_1.default.isClassDeclaration(node)) &&
        node.name) {
        // function foo() { ... }
        // class foo { ... } (or its methods)
        return node.name.getText(sourceFile);
    }
    else if (typescript_1.default.isCallExpression(node) &&
        typescript_1.default.isIdentifier(node.expression) &&
        node.arguments.some((arg) => typescript_1.default.isArrowFunction(arg) || typescript_1.default.isFunctionExpression(arg))) {
        // Call expressions where at least one of the arguments is a function
        // beforeAll(() => { ... })
        return node.expression.text;
    }
    else if (typescript_1.default.isConstructorDeclaration(node)) {
        // class Foo { constructor() { ... } }
        return "constructor";
    }
}
function getCodePathAtPosition(sourceFile, position, separator = "/") {
    function visit(node, path) {
        const start = node.getStart(sourceFile);
        if (start > position)
            return;
        const end = node.getEnd();
        if (end < position)
            return;
        // The position is somewhere inside this node, recurse!
        const nodeName = getNodeName(sourceFile, node);
        if (nodeName)
            path.push(nodeName);
        typescript_1.default.forEachChild(node, (member) => visit(member, path));
    }
    const path = [];
    typescript_1.default.forEachChild(sourceFile, (node) => visit(node, path));
    return path.join(separator);
}
function codefind(query) {
    const tsConfig = (0, tsAPITools_1.loadTSConfig)(undefined, false);
    const program = typescript_1.default.createProgram(tsConfig.fileNames, {
        ...tsConfig.options,
        preserveSymlinks: false,
    });
    // const checker = program.getTypeChecker();
    const results = [];
    // Scan all source files
    for (const sourceFile of program.getSourceFiles()) {
        const relativePath = relativeToProject(sourceFile.fileName);
        const relativePathMatchesPattern = (pattern) => {
            const { regex } = (0, globrex_1.default)(pattern, { extended: true });
            return regex.test(relativePath);
        };
        // If an include pattern is given, make sure the relative path matches at least one
        if (query.filePatterns &&
            !query.filePatterns.some((pattern) => relativePathMatchesPattern(pattern))) {
            continue;
        }
        // If an exclude pattern is given, make sure the relative path matches none
        if (query.excludeFilePatterns &&
            query.excludeFilePatterns.some((pattern) => relativePathMatchesPattern(pattern))) {
            continue;
        }
        let codePatterns;
        if (query.codePatterns) {
            codePatterns = query.codePatterns.map((pattern) => (0, globrex_1.default)(pattern, {
                extended: true,
            }).regex);
        }
        let excludeCodePatterns;
        if (query.excludeCodePatterns) {
            excludeCodePatterns = query.excludeCodePatterns.map((pattern) => (0, globrex_1.default)(pattern, {
                extended: true,
            }).regex);
        }
        const searchNodes = [];
        if (codePatterns || excludeCodePatterns) {
            const pathMatches = (path) => {
                const fullPath = path.join("/");
                if (excludeCodePatterns?.some((pattern) => pattern.test(fullPath))) {
                    // This code pattern is excluded
                    return false;
                }
                else if (codePatterns?.some((pattern) => pattern.test(fullPath))) {
                    // This code pattern is included
                    return true;
                }
                else {
                    return "unknown";
                }
            };
            function visit(node, path) {
                const nodeName = getNodeName(sourceFile, node);
                if (nodeName) {
                    // This node has a name, check if it is a match
                    const newPath = [...path, nodeName];
                    const match = pathMatches(newPath);
                    if (match === false) {
                        // This node is excluded, do not look further
                        return;
                    }
                    else if (match === true) {
                        // This node is of interest
                        searchNodes.push([newPath.join("/"), node]);
                    }
                    else {
                        // no match, but new path segment to remember
                        // Iterate through children
                        typescript_1.default.forEachChild(node, (member) => visit(member, newPath));
                    }
                }
                else {
                    // No name, iterate through children with the same name
                    typescript_1.default.forEachChild(node, (member) => visit(member, path));
                }
            }
            typescript_1.default.forEachChild(sourceFile, (node) => visit(node, []));
        }
        else {
            // Simply look at the entire source file
            searchNodes.push(["/", sourceFile]);
        }
        for (const [, node] of searchNodes) {
            const text = node.getText(sourceFile);
            if (typeof query.search === "string") {
                // Find all occurrences of simple strings in the node
                let startIndex = 0;
                let foundIndex = -1;
                while (((foundIndex = text.indexOf(query.search, startIndex)),
                    foundIndex !== -1)) {
                    const matchPosition = node.getStart(sourceFile) + foundIndex;
                    const location = typescript_1.default.getLineAndCharacterOfPosition(sourceFile, matchPosition);
                    const pathAtPosition = getCodePathAtPosition(sourceFile, matchPosition, " / ");
                    results.push(formatResult(sourceFile, {
                        file: relativePath,
                        codePath: pathAtPosition,
                        ...location,
                        match: query.search,
                    }, query.options?.additionalLines));
                    startIndex = foundIndex + query.search.length;
                }
            }
            else {
                // Find all occurrences of regex in the node
                const matches = text.matchAll(query.search);
                for (const match of matches) {
                    const matchPosition = node.getStart(sourceFile) + match.index;
                    const location = typescript_1.default.getLineAndCharacterOfPosition(sourceFile, matchPosition);
                    const pathAtPosition = getCodePathAtPosition(sourceFile, matchPosition, " / ");
                    results.push(formatResult(sourceFile, {
                        file: relativePath,
                        codePath: pathAtPosition,
                        ...location,
                        match: match[0],
                    }, query.options?.additionalLines));
                }
            }
        }
    }
    return results;
}
exports.codefind = codefind;
if (require.main === module) {
    const argv = yargs_1.default
        .usage("Code search utility\n\nUsage: $0 [options]")
        .options({
        include: {
            alias: "i",
            describe: "Glob of files to include in the search. Default: all",
            type: "string",
            array: true,
        },
        exclude: {
            alias: "e",
            describe: "Glob of files to exclude from the search. Default: none",
            type: "string",
            array: true,
        },
        codePattern: {
            alias: "c",
            describe: "Glob of code paths to include in the search, e.g. 'class*/methodName'. Default: all",
            type: "string",
            array: true,
        },
        excludeCodePatterns: {
            alias: "x",
            describe: "Glob of code paths to exclude from the search, e.g. 'class*/methodName'. Default: none",
            type: "string",
            array: true,
        },
        regex: {
            alias: "r",
            describe: "Whether the search should be interpreted as a regex (true) or a simple string (false). Default: false",
            type: "boolean",
        },
        search: {
            alias: "s",
            describe: "What to search for",
            type: "string",
        },
        lines: {
            alias: "l",
            describe: "How many additional lines around the match to show",
            type: "number",
            default: 3,
        },
    })
        .wrap(Math.min(100, yargs_1.default.terminalWidth()))
        .demandOption("search", "Please specify a search query")
        .parseSync();
    const query = {
        filePatterns: argv.include,
        excludeFilePatterns: argv.exclude,
        codePatterns: argv.codePattern,
        excludeCodePatterns: argv.excludeCodePatterns,
        search: argv.regex ? new RegExp(argv.search) : argv.search,
        options: {
            additionalLines: Math.max(0, argv.lines),
        },
    };
    const start = Date.now();
    const results = codefind(query);
    const duration = Date.now() - start;
    console.log();
    for (const result of results) {
        console.log(`${(0, ansi_colors_1.blueBright)((0, ansi_colors_1.bold)(result.file))}:${(0, ansi_colors_1.yellow)((result.line + 1).toString())}:${(0, ansi_colors_1.yellow)((result.character + 1).toString())}`);
        console.log((0, ansi_colors_1.redBright)((0, ansi_colors_1.bold)(`⤷ ${result.codePath}`)));
        console.log(result.formatted);
        console.log();
        console.log();
    }
    console.log(`Found ${(0, ansi_colors_1.bold)((0, ansi_colors_1.greenBright)(results.length.toString()))} result${results.length === 1 ? "" : "s"} in ${(0, ansi_colors_1.bold)((0, ansi_colors_1.yellow)(duration.toString()))} ms`);
    console.log();
}
//# sourceMappingURL=codefind.js.map