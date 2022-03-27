import type ts from "typescript";

interface Options {
	shortCircuit: boolean;
	transformNonNullExpressions: boolean;
	emitDetailedErrors: boolean | "auto";
}

export interface VisitorContext extends FileSpecificVisitorContext {
	functionNames: Set<string>;
	functionMap: Map<string, ts.FunctionDeclaration>;
	typeIdMap: Map<string, string>;
}

export interface FileSpecificVisitorContext extends PartialVisitorContext {
	factory: ts.NodeFactory;
	typeAssertions: Map<string, ts.ArrowFunction>;
	typeIdModuleMap: Map<number, string>;
	sourceFile: ts.SourceFile;
}

export interface PartialVisitorContext {
	program: ts.Program;
	checker: ts.TypeChecker;
	compilerOptions: ts.CompilerOptions;
	options: Options;
	typeMapperStack: Map<ts.Type, ts.Type>[];
	previousTypeReference: ts.Type | null;
	canonicalPaths: Map<string, string>;
}
