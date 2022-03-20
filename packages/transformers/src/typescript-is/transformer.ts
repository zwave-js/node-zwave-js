import ts from "typescript";
import { transformNode } from "./transform-node";
import type {
	PartialVisitorContext,
	VisitorContextWithFactory,
} from "./visitor-context";

function getFunctionBehavior(options?: {
	[Key: string]: unknown;
}): PartialVisitorContext["options"]["functionBehavior"] {
	if (options) {
		if (options.functionBehavior) {
			if (
				options.functionBehavior === "ignore" ||
				options.functionBehavior === "basic"
			) {
				return options.functionBehavior;
			}
		} else {
			if (!!options.ignoreFunctions) {
				return "ignore";
			}
		}
	}
	return "error";
}

function getEmitDetailedErrors(options?: {
	[Key: string]: unknown;
}): PartialVisitorContext["options"]["emitDetailedErrors"] {
	if (options) {
		if (
			options.emitDetailedErrors === "auto" ||
			typeof options.emitDetailedErrors === "boolean"
		) {
			return options.emitDetailedErrors;
		}
	}
	return "auto";
}

export default function transformer(
	program: ts.Program,
	options?: { [Key: string]: unknown },
): ts.TransformerFactory<ts.SourceFile> {
	if (options && options.verbose) {
		console.log(
			`typescript-is: transforming program with ${
				program.getSourceFiles().length
			} source files; using TypeScript ${ts.version}.`,
		);
	}

	const visitorContext: PartialVisitorContext = {
		program,
		checker: program.getTypeChecker(),
		compilerOptions: program.getCompilerOptions(),
		options: {
			shortCircuit: !!(options && options.shortCircuit),
			ignoreClasses: !!(options && options.ignoreClasses),
			ignoreMethods: !!(options && options.ignoreMethods),
			functionBehavior: getFunctionBehavior(options),
			disallowSuperfluousObjectProperties: !!(
				options && options.disallowSuperfluousObjectProperties
			),
			transformNonNullExpressions: !!(
				options && options.transformNonNullExpressions
			),
			emitDetailedErrors: getEmitDetailedErrors(options),
		},
		typeMapperStack: [],
		previousTypeReference: null,
		canonicalPaths: new Map(),
	};
	return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
		return transformNodeAndChildren(file, program, context, {
			...visitorContext,
			factory: context.factory,
		});
	};
}

function transformNodeAndChildren(
	node: ts.SourceFile,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: VisitorContextWithFactory,
): ts.SourceFile;
function transformNodeAndChildren(
	node: ts.Node,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: VisitorContextWithFactory,
): ts.Node;
function transformNodeAndChildren(
	node: ts.Node,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: VisitorContextWithFactory,
): ts.Node {
	let transformedNode: ts.Node;
	try {
		transformedNode = transformNode(node, visitorContext);
	} catch (error: any) {
		const sourceFile = node.getSourceFile();
		const { line, character } = sourceFile.getLineAndCharacterOfPosition(
			node.pos,
		);
		throw new Error(
			`Failed to transform node at: ${sourceFile.fileName}:${line + 1}:${
				character + 1
			}: ${error.stack}`,
		);
	}
	return ts.visitEachChild(
		transformedNode,
		(childNode) =>
			transformNodeAndChildren(
				childNode,
				program,
				context,
				visitorContext,
			),
		context,
	);
}
