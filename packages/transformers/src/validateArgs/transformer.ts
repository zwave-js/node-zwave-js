import ts from "typescript";
import { createGenericAssertFunction, transformNode } from "./transform-node";
import type {
	FileSpecificVisitorContext,
	PartialVisitorContext,
} from "./visitor-context";

function getEmitDetailedErrors(options?: {
	[Key: string]: unknown;
}): PartialVisitorContext["options"]["emitDetailedErrors"] {
	if (options) {
		if (
			options.emitDetailedErrors === "auto"
			|| typeof options.emitDetailedErrors === "boolean"
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
	if (options?.verbose) {
		console.log(
			`@zwave-js/transformer: transforming program with ${program.getSourceFiles().length} source files; using TypeScript ${ts.version}.`,
		);
	}

	const visitorContext: PartialVisitorContext = {
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
	return (context: ts.TransformationContext) => (file: ts.SourceFile) => {
		// Bail early if there is no import for "@zwave-js/transformers". In this case, there's nothing to transform
		if (!file.getFullText().includes("@zwave-js/transformers")) {
			if (options?.verbose) {
				console.log(
					`@zwave-js/transformers not imported in ${file.fileName}, skipping`,
				);
			}
			return file;
		}

		const factory = context.factory;
		const fileVisitorContext: FileSpecificVisitorContext = {
			...visitorContext,
			factory,
			typeAssertions: new Map(),
			typeIdModuleMap: new Map(),
			sourceFile: file,
		};
		file = transformNodeAndChildren(
			file,
			program,
			context,
			fileVisitorContext,
		);

		// Remove @zwave-js/transformers import
		const selfImports = file.statements
			.filter((s) => ts.isImportDeclaration(s))
			.filter(
				(i) =>
					i.moduleSpecifier
						.getText(file)
						.replaceAll(/^["']|["']$/g, "")
						=== "@zwave-js/transformers",
			);
		if (selfImports.length > 0) {
			file = context.factory.updateSourceFile(
				file,
				file.statements.filter((s) => !selfImports.includes(s as any)),
				file.isDeclarationFile,
				file.referencedFiles,
				file.typeReferenceDirectives,
				file.hasNoDefaultLib,
				file.libReferenceDirectives,
			);
		}

		// Add top-level declarations
		const newStatements: ts.Statement[] = [];

		if (fileVisitorContext.typeAssertions.size > 0) {
			// Generic assert function used by all assertions
			newStatements.push(createGenericAssertFunction(factory));
			// And the individual "named" assertions
			for (
				const [
					typeName,
					assertion,
				] of fileVisitorContext.typeAssertions
			) {
				newStatements.push(
					factory.createVariableStatement(
						undefined,
						factory.createVariableDeclarationList(
							[
								factory.createVariableDeclaration(
									factory.createIdentifier(
										`__assertType__${typeName}`,
									),
									undefined,
									undefined,
									assertion,
								),
							],
							ts.NodeFlags.Const,
						),
					),
				);
			}
		}

		if (newStatements.length > 0) {
			file = context.factory.updateSourceFile(
				file,
				[...newStatements, ...file.statements],
				file.isDeclarationFile,
				file.referencedFiles,
				file.typeReferenceDirectives,
				file.hasNoDefaultLib,
				file.libReferenceDirectives,
			);
		}

		return file;
	};
}

function transformNodeAndChildren(
	node: ts.SourceFile,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: FileSpecificVisitorContext,
): ts.SourceFile;
function transformNodeAndChildren(
	node: ts.Node,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: FileSpecificVisitorContext,
): ts.Node;
function transformNodeAndChildren(
	node: ts.Node,
	program: ts.Program,
	context: ts.TransformationContext,
	visitorContext: FileSpecificVisitorContext,
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
