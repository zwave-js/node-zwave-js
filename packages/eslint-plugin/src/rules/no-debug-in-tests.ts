import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import path from "node:path";
import { repoRoot } from "../utils.js";

const integrationTestDefinitionFiles = new Set(
	[
		"packages/zwave-js/src/lib/test/integrationTestSuite",
		"packages/zwave-js/src/lib/test/integrationTestSuiteMulti",
		"packages/zwave-js/src/lib/test/integrationTestSuite.ts",
		"packages/zwave-js/src/lib/test/integrationTestSuiteMulti.ts",
		"packages/zwave-js/src/lib/test/integrationTestSuite.js",
		"packages/zwave-js/src/lib/test/integrationTestSuiteMulti.js",
	].map((p) => p.replaceAll("/", path.sep))
		.map((p) => path.join(repoRoot, p)),
);

const integrationTestExportNames = new Set([
	"integrationTest",
]);

export const noDebugInTests = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		const integrationTestMethodNames = new Set<string>();

		return {
			ImportSpecifier(node) {
				if (!context.filename.endsWith(".test.ts")) return;

				// Figure out how the integration test methods are imported
				if (
					// node.importKind === "value"
					integrationTestExportNames.has(node.imported.name)
					&& node.parent.type === AST_NODE_TYPES.ImportDeclaration
					&& integrationTestDefinitionFiles.has(path.join(
						path.dirname(context.filename),
						node.parent.source.value,
					))
				) {
					integrationTestMethodNames.add(node.local.name);
					console.log(
						"Found integration test method",
						node.local.name,
					);
				}
			},
			Property(node) {
				if (!context.filename.endsWith(".test.ts")) return;
				if (!integrationTestMethodNames.size) return; // no integration test imports

				if (
					node.key.type === AST_NODE_TYPES.Identifier
					&& node.key.name === "debug"
					&& node.parent.type === AST_NODE_TYPES.ObjectExpression
					&& node.parent.parent.type === AST_NODE_TYPES.CallExpression
					&& node.parent.parent.callee.type
						=== AST_NODE_TYPES.Identifier
					&& integrationTestMethodNames.has(
						node.parent.parent.callee.name,
					)
				) {
					context.report({
						node,
						messageId: "no-debug",
						fix: (fixer) => fixer.insertTextBefore(node, "// "),
					});
				}
			},
		};
	},
	meta: {
		docs: {
			description:
				"Integration tests should have the `debug` flag set to `false` when not actively debugging.",
		},
		type: "problem",
		fixable: "code",
		schema: [],
		messages: {
			"no-debug":
				"Comment out the `debug` flag when not actively debugging.",
		},
	},
	defaultOptions: [],
});
