import type ts from "typescript";

interface Options {
	shortCircuit: boolean;
	ignoreClasses: boolean;
	ignoreMethods: boolean;
	functionBehavior: "error" | "ignore" | "basic";
	disallowSuperfluousObjectProperties: boolean;
	transformNonNullExpressions: boolean;
	emitDetailedErrors: boolean | "auto";
}

export interface VisitorContext extends VisitorContextWithFactory {
	functionNames: Set<string>;
	functionMap: Map<string, ts.FunctionDeclaration>;
	typeIdMap: Map<string, string>;
	overrideDisallowSuperfluousObjectProperies?: boolean;
}

export interface VisitorContextWithFactory extends PartialVisitorContext {
	factory: ts.NodeFactory;
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
