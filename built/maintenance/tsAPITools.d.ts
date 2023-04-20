import { CommandClasses } from "@zwave-js/core";
import ts from "typescript";
export declare const projectRoot: string;
export declare const repoRoot: string;
/** Used for ts-morph */
export declare const tsConfigFilePath: string;
export declare function loadTSConfig(packageName?: string, build?: boolean): {
    options: ts.CompilerOptions;
    fileNames: string[];
};
export declare function expressionToCommandClass(sourceFile: ts.SourceFile, enumExpr: ts.Node): CommandClasses | undefined;
export declare function getCommandClassFromDecorator(sourceFile: ts.SourceFile, decorator: ts.Decorator): CommandClasses | undefined;
export declare function getCommandClassFromClassDeclaration(sourceFile: ts.SourceFile, node: ts.ClassDeclaration): CommandClasses | undefined;
export declare function hasComment(sourceFile: ts.SourceFile, node: ts.Node, predicate: (text: string, commentKind: ts.CommentKind) => boolean): boolean;
//# sourceMappingURL=tsAPITools.d.ts.map