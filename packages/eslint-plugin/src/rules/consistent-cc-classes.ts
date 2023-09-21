import { AST_NODE_TYPES, ESLintUtils } from "@typescript-eslint/utils";
import {
	findDecorator,
	findDecoratorContainingCCId,
	getCCNameFromDecorator,
} from "../utils";

export const consistentCCClasses = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		let currentCCName: string | undefined;

		return {
			ClassDeclaration(node) {
				// Only look at class declarations ending with "CC"
				if (!node.id?.name.endsWith("CC")) return;
				// Except InvalidCC, which is a special case
				if (node.id?.name === "InvalidCC") return;

				// These must...

				// ...be in a file that ends with "CC.ts"
				if (!context.getFilename().endsWith("CC.ts")) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "wrong-filename",
					});
				}

				// ...have an @commandClass decorator
				const ccDecorator = findDecoratorContainingCCId(node, [
					"commandClass",
				]);
				if (!ccDecorator) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "missing-cc-decorator",
					});
				} else {
					currentCCName = getCCNameFromDecorator(ccDecorator);
				}

				// ...have a @implementedVersion decorator
				const versionDecorator = findDecorator(
					node,
					"implementedVersion",
				);
				if (!versionDecorator) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "missing-version-decorator",
					});
				}

				// ...be exported
				if (
					node.parent.type !== AST_NODE_TYPES.ExportNamedDeclaration
					|| node.parent.exportKind !== "value"
				) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "must-export",
						fix: (fixer) => fixer.insertTextBefore(node, "export "),
					});
				}

				// ...inherit from CommandClass
				if (
					!node.superClass
					|| node.superClass.type !== AST_NODE_TYPES.Identifier
					|| node.superClass.name !== "CommandClass"
				) {
					context.report({
						node,
						loc: node.id.loc,
						fix: (fixer) =>
							node.superClass
								? fixer.replaceText(
									node.superClass,
									"CommandClass",
								)
								: fixer.insertTextAfter(
									node.id!,
									" extends CommandClass",
								),
						messageId: "must-inherit-commandclass",
					});
				}
			},
			"ClassDeclaration:exit"(_node) {
				currentCCName = undefined;
			},
		};
	},
	meta: {
		docs: {
			description:
				"Ensures that CC implementations follow certain conventions.",
		},
		type: "problem",
		schema: [],
		fixable: "code",
		messages: {
			"wrong-filename":
				"Classes that end with `CC` are considered CC implementations and MUST be in a file whose name ends with `CC.ts`",
			"missing-cc-decorator":
				"Classes implementing a CC must have a CC assigned using the `@commandClass(...)` decorator",
			"missing-version-decorator":
				"Classes implementing a CC must be decorated with `@implementedVersion(...)`",
			"must-export": "Classes implementing a CC must be exported",
			"must-inherit-commandclass":
				"Classes implementing a CC MUST inherit from `CommandClass`",
		},
	},
	defaultOptions: [],
});
