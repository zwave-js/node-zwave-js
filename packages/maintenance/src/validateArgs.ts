import ts from "typescript";
import { findImportDeclaration, hasNamedImport } from "./tsAPITools";

/** Generates code at build time which validates all arguments of this method */
export function validateArgs(): PropertyDecorator {
	return (_target: unknown, _property: string | number | symbol) => {
		// this is a no-op that gets replaced during the build process using the transformer below
	};
}

function isValidateArgsDecorator(
	sourceFile: ts.SourceFile,
	decorator: ts.Decorator,
): boolean {
	if (!ts.isCallExpression(decorator.expression)) return false;
	const decoratorName = decorator.expression.expression.getText(sourceFile);
	return (
		decoratorName === "validateArgs" &&
		decorator.expression.arguments.length === 0
	);
}

interface TransformContext {
	didStuff: boolean;
}

export default function transform(
	program: ts.Program,
	_pluginOptions: any,
): ts.TransformerFactory<ts.SourceFile> {
	return (ctx: ts.TransformationContext) => {
		return (sourceFile: ts.SourceFile): ts.SourceFile => {
			console.log(`validateArgs => transforming ${sourceFile.fileName}`);

			function visitor(node: ts.Node, tc: TransformContext): ts.Node {
				if (ts.isMethodDeclaration(node)) {
					const decorator = node.decorators?.find((d) =>
						isValidateArgsDecorator(sourceFile, d),
					);
					if (!decorator) return node;

					// This is a method which was decorated with @validateArgs
					// Remove the decorator and prepend its body with the validation code
					let method = ctx.factory.updateMethodDeclaration(
						node,
						node.decorators?.filter((d) => d !== decorator),
						node.modifiers,
						node.asteriskToken,
						node.name,
						node.questionToken,
						node.typeParameters,
						node.parameters,
						node.type,
						node.body,
					);

					method = method;

					tc.didStuff = true;
					return method;
				}
				return ts.visitEachChild(
					node,
					(node) => visitor(node, tc),
					ctx,
				);
			}
			// TODO: only visit CC API methods
			const tc: TransformContext = {
				didStuff: false,
			};
			sourceFile = ts.visitEachChild(
				sourceFile,
				(node) => visitor(node, tc),
				ctx,
			);

			if (tc.didStuff) {
				console.log(`updated ${sourceFile.fileName}`);

				const newStatements: ts.Statement[] = [];
				if (!hasNamedImport(sourceFile, "typescript-is", "createIs")) {
					newStatements.push(
						ctx.factory.createImportDeclaration(
							undefined,
							undefined,
							ctx.factory.createImportClause(
								false,
								undefined,
								ctx.factory.createNamedImports([
									ctx.factory.createImportSpecifier(
										false,
										undefined,
										ctx.factory.createIdentifier(
											"createIs",
										),
									),
								]),
							),
							ctx.factory.createStringLiteral("typescript-is"),
						),
					);
				}

				newStatements.push(
					ctx.factory.createVariableStatement(
						undefined,
						// [
						// 	ctx.factory.createModifier(
						// 		ts.SyntaxKind.ConstKeyword,
						// 	),
						// ],
						ctx.factory.createVariableDeclarationList([
							ctx.factory.createVariableDeclaration(
								"isFoo",
								undefined,
								undefined,
								ctx.factory.createCallExpression(
									ctx.factory.createIdentifier("createIs"),
									[
										ctx.factory.createTypeReferenceNode(
											"Foo",
										),
									],
									undefined,
								),
							),
						]),
					),
				);

				const maintenanceImport = findImportDeclaration(
					sourceFile,
					"@zwave-js/maintenance",
					"validateArgs",
				);

				const existingStatements = sourceFile.statements.filter(
					(s) => s !== maintenanceImport,
				);

				sourceFile = ctx.factory.updateSourceFile(
					sourceFile,
					[...newStatements, ...existingStatements],
					sourceFile.isDeclarationFile,
					sourceFile.referencedFiles,
					sourceFile.typeReferenceDirectives,
					sourceFile.hasNoDefaultLib,
					sourceFile.libReferenceDirectives,
				);

				// Re-create the transformed source file so it can be properly consumed by the next transformer
				const printer = ts.createPrinter();
				const result = printer.printNode(
					ts.EmitHint.SourceFile,
					sourceFile,
					sourceFile,
				);
				return ts.createSourceFile(
					sourceFile.fileName,
					result,
					program.getCompilerOptions().target ??
						ts.ScriptTarget.Latest,
					true,
					ts.ScriptKind.TS,
				);
			}

			return sourceFile;
		};
	};
}
