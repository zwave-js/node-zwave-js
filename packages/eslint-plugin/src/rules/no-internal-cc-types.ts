import {
	AST_NODE_TYPES,
	AST_TOKEN_TYPES,
	ESLintUtils,
	type TSESTree,
} from "@typescript-eslint/utils";
import { type Rule } from "../utils.js";

// const isFixMode = process.argv.some((arg) => arg.startsWith("--fix"));

export const noInternalCCTypes: Rule = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		const localTypeNodes = new Map<
			string,
			| TSESTree.TSInterfaceDeclaration
			| TSESTree.TSTypeAliasDeclaration
			| TSESTree.ExportNamedDeclaration
		>();
		const nonExportedTypes = new Set<string>();
		const nonMarkedTypes = new Set<string>();

		let isInMethodDefinition = false;
		let isInFunctionExpression = false;
		let isInFunctionBody = false;
		let isInReturnType = false;
		let isInParameterType = false;

		return {
			// Remember which declarations are exported
			"TSInterfaceDeclaration,TSTypeAliasDeclaration"(
				node:
					| TSESTree.TSInterfaceDeclaration
					| TSESTree.TSTypeAliasDeclaration,
			) {
				if (node.id.name === "BasicCCSetOptions") debugger;
				let fullNode:
					| TSESTree.TSInterfaceDeclaration
					| TSESTree.TSTypeAliasDeclaration
					| TSESTree.ExportNamedDeclaration;
				if (
					node.parent.type === AST_NODE_TYPES.ExportNamedDeclaration
				) {
					fullNode = node.parent;
					localTypeNodes.set(node.id.name, fullNode);
				} else if (node.parent.type === AST_NODE_TYPES.Program) {
					fullNode = node;
					localTypeNodes.set(node.id.name, fullNode);
					nonExportedTypes.add(node.id.name);
				} else {
					return;
				}

				// Check if the type is marked with @publicAPI
				const comments = context.sourceCode.getCommentsBefore(fullNode);
				if (
					!comments.some((c) => c.value.includes("@publicAPI"))
				) {
					nonMarkedTypes.add(node.id.name);
				}
			},

			// Then check public class methods that use them
			MethodDefinition(node) {
				// Only check methods that are public
				if (node.accessibility !== "public") return;
				// // ...that have an implementation (so no overload declarations)
				// if (node.kind !== "method") return;
				// ... and have a name
				if (node.key.type !== AST_NODE_TYPES.Identifier) return;

				// Ignore @internal methods
				const comments = context.sourceCode.getCommentsBefore(node);
				if (
					comments.some((c) =>
						c.type === AST_TOKEN_TYPES.Block
						&& c.value.startsWith("*")
						&& c.value.includes("@internal")
					)
				) {
					return;
				}

				isInMethodDefinition = true;
			},
			"MethodDefinition:exit"(_node) {
				isInMethodDefinition = false;
			},

			// Only consider function expressions...
			FunctionExpression(node) {
				// ...that are the implementation of a public method
				if (!isInMethodDefinition) return;
				if (
					node.parent.type !== AST_NODE_TYPES.MethodDefinition
					|| node.parent.value !== node
				) {
					return;
				}
				// ...and that have parameters
				if (node.params.length === 0) return;
				isInFunctionExpression = true;
			},
			"FunctionExpression:exit"(_node) {
				isInFunctionExpression = false;
			},

			// Ignore the function body
			BlockStatement(_node) {
				if (isInFunctionExpression) {
					isInFunctionBody = true;
				}
			},
			"BlockStatement:exit"(_node) {
				isInFunctionBody = false;
			},

			// Figure out if the type annotation belongs to the return type or a parameter
			TSTypeAnnotation(node) {
				if (!isInFunctionExpression) return;
				if (isInFunctionBody) return;

				if (
					node.parent.type === AST_NODE_TYPES.FunctionExpression
					&& node.parent.returnType === node
				) {
					isInReturnType = true;
				} else {
					isInParameterType = true;
				}
			},
			"TSTypeAnnotation:exit"(_node) {
				isInReturnType = false;
				isInParameterType = false;
			},

			TSTypeReference(node) {
				if (isInReturnType) return;
				if (!isInParameterType) return;

				// Figure out if this type is exported or not
				if (node.typeName.type !== AST_NODE_TYPES.Identifier) return;
				const typeName = node.typeName.name;

				// Only report on local types
				if (!localTypeNodes.has(typeName)) return;
				const typeNode = localTypeNodes.get(typeName)!;

				const missingExport = nonExportedTypes.has(typeName);
				const missingMarker = nonMarkedTypes.has(typeName);

				if (missingExport && !missingMarker) {
					context.report({
						loc: node.loc,
						messageId: "public-type-missing-export",
						data: { type: typeName },
						suggest: [{
							messageId: "add-export",
							data: { type: typeName },
							fix: (fixer) =>
								fixer.insertTextBefore(typeNode, "export "),
						}],
					});
				} else if (missingMarker && !missingExport) {
					context.report({
						loc: node.loc,
						messageId: "public-type-missing-marker",
						data: { type: typeName },
						suggest: [{
							messageId: "add-marker",
							data: { type: typeName },
							fix: (fixer) =>
								fixer.insertTextBefore(
									typeNode,
									"// @publicAPI\n",
								),
						}],
					});
				} else if (missingExport && missingMarker) {
					context.report({
						loc: node.loc,
						messageId: "public-type-missing-export-and-marker",
						data: { type: typeName },
						suggest: [{
							messageId: "add-export-and-marker",
							data: { type: typeName },
							fix: (fixer) =>
								fixer.insertTextBefore(
									typeNode,
									"// @publicAPI\nexport ",
								),
						}],
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description:
				"Prevent public CC methods from using non-exported types",
		},
		type: "problem",
		fixable: "code",
		hasSuggestions: true,
		// Do not auto-fix these on the CLI
		// fixable: isFixMode ? undefined : "code",
		schema: [],
		messages: {
			"public-type-missing-export":
				"'{{type}}' used in the public API must be exported",
			"add-export": "Export {{type}}",
			"public-type-missing-marker":
				"'{{type}}' used in public API must be marked with a @publicAPI comment",
			"add-marker": "Add @publicAPI comment to '{{type}}'",
			"public-type-missing-export-and-marker":
				"'{{type}}' used in the public API must be exported and marked with a @publicAPI comment",
			"add-export-and-marker":
				"Export and add @publicAPI comment to '{{type}}'",
		},
	},
	defaultOptions: [],
});
