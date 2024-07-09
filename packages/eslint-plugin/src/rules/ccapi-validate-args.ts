import {
	AST_NODE_TYPES,
	AST_TOKEN_TYPES,
	ESLintUtils,
} from "@typescript-eslint/utils";
import {
	type Rule,
	findDecoratorContainingCCId,
	getCCNameFromDecorator,
} from "../utils.js";

const isFixMode = process.argv.some((arg) => arg.startsWith("--fix"));

export const ccAPIValidateArgs: Rule = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		let currentAPIClassCCName: string | undefined;
		let validateArgsImport: string | undefined;

		return {
			ImportDeclaration(node) {
				if (!!validateArgsImport) return;
				if (
					node.source.value === "@zwave-js/transformers"
					&& node.importKind === "value"
				) {
					const importSpecifier = node.specifiers.find((s) =>
						s.type
							=== AST_NODE_TYPES.ImportSpecifier
						&& s.importKind === "value"
						&& s.imported.name === "validateArgs"
					);
					validateArgsImport = importSpecifier?.local.name;
				}
			},
			ClassDeclaration(node) {
				const APIDecorator = findDecoratorContainingCCId(node, ["API"]);
				if (!APIDecorator) return;

				currentAPIClassCCName = getCCNameFromDecorator(APIDecorator);
			},
			MethodDefinition(node) {
				// Only check methods inside a class decorated with @API
				if (!currentAPIClassCCName) return;
				// ...that are public
				if (node.accessibility !== "public") return;
				// ...that have an implementation (so no overload declarations)
				if (node.kind !== "method") return;
				if (node.value.type !== AST_NODE_TYPES.FunctionExpression) {
					return;
				}
				// ...that have parameters
				if (node.value.params.length === 0) return;
				// ... and a name
				if (node.key.type !== AST_NODE_TYPES.Identifier) return;

				// Ignore some methods
				if (
					node.key.name === "supportsCommand"
					|| node.key.name === "isSetValueOptimistic"
				) {
					return;
				}

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

				// Check if the method has an @validateArgs decorator
				if (
					node.decorators.some((d) =>
						d.expression.type === AST_NODE_TYPES.CallExpression
						&& d.expression.callee.type
							=== AST_NODE_TYPES.Identifier
						&& d.expression.callee.name
							=== (validateArgsImport || "validateArgs")
					)
				) {
					return;
				}

				// None found, report an error
				const lineOfMethod = context.sourceCode.lines[
					node.loc.start.line - 1
				];
				const indentation = lineOfMethod.slice(
					0,
					node.loc.start.column,
				);

				context.report({
					node,
					loc: node.key.loc,
					messageId: "add-decorator",
					fix: isFixMode ? undefined : function*(fixer) {
						if (!validateArgsImport) {
							validateArgsImport = "validateArgs";
							yield fixer.insertTextBeforeRange(
								[0, 0],
								`import { validateArgs } from "@zwave-js/transformers";\n`,
							);
						}
						yield fixer.insertTextBefore(
							node,
							`@${validateArgsImport}()\n${indentation}`,
						);
					},
				});
			},
			"ClassDeclaration:exit"(_node) {
				currentAPIClassCCName = undefined;
			},
		};
	},
	meta: {
		docs: {
			description:
				"Public CC API methods should have argument validation to catch user errors.",
		},
		type: "problem",
		// Do not auto-fix these on the CLI
		fixable: isFixMode ? undefined : "code",
		schema: [],
		messages: {
			"add-decorator":
				"Missing argument validation for public CC API method.",
		},
	},
	defaultOptions: [],
});
