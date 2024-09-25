import {
	AST_NODE_TYPES,
	ESLintUtils,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import { type CommandClasses, applicationCCs, getCCName } from "@zwave-js/core";
import path from "node:path";
import {
	findDecorator,
	findDecoratorContainingCCId,
	getCCIdFromDecorator,
	getCCIdFromExpression,
} from "../utils.js";

const apiBaseClasses = new Set(["CCAPI", "PhysicalCCAPI"]);

function getRequiredInterviewCCsFromMethod(
	method: TSESTree.MethodDefinition,
): { node: TSESTree.MemberExpression; ccId: CommandClasses }[] | undefined {
	const returnExpression = method.value.body?.body.find(
		(
			s,
		): s is TSESTree.ReturnStatement & {
			argument: TSESTree.ArrayExpression;
		} => s.type === AST_NODE_TYPES.ReturnStatement
			&& s.argument?.type === AST_NODE_TYPES.ArrayExpression,
	);
	if (!returnExpression) return;

	const memberExpressionsInArray = returnExpression.argument.elements.filter(
		(e): e is TSESTree.MemberExpression =>
			e?.type === AST_NODE_TYPES.MemberExpression,
	);

	// @ts-expect-error
	return memberExpressionsInArray
		.map((e) => ({
			node: e,
			ccId: getCCIdFromExpression(e),
		}))
		.filter(({ ccId }) => ccId != undefined);
}

export const consistentCCClasses = ESLintUtils.RuleCreator.withoutDocs({
	create(context) {
		let currentCCId: CommandClasses | undefined;

		return {
			// Look at class declarations ending with "CC"
			"ClassDeclaration[id.name=/CC$/]"(
				node: TSESTree.ClassDeclaration & {
					id: TSESTree.Identifier;
				},
			) {
				// if (!node.id?.name.endsWith("CC")) return;
				// Except InvalidCC, which is a special case
				if (node.id?.name === "InvalidCC") return;

				// These must...

				// ...be in a file that ends with "CC.ts"
				if (!context.filename.endsWith("CC.ts")) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "wrong-filename",
					});
				} else if (
					context.filename.split(path.sep).includes(
						"manufacturerProprietary",
					)
				) {
					// The rules for manufacturer proprietary CCs are different
					return;
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
					currentCCId = getCCIdFromDecorator(ccDecorator);
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
						fix: (fixer) => {
							const classKeyword = context.sourceCode
								.getTokensBefore(
									node.id,
									{
										filter: (t) =>
											t.type === "Keyword"
											&& t.value === "class",
									},
								).at(-1);

							return fixer.insertTextBefore(
								classKeyword!,
								"export ",
							);
						},
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
									node.id,
									" extends CommandClass",
								),
						messageId: "must-inherit-commandclass",
					});
				}
			},
			MethodDefinition(node) {
				// Only care about methods inside non-application CC classes,
				// since only application CCs may depend on other application CCs
				if (!currentCCId || applicationCCs.includes(currentCCId)) {
					return;
				}

				// ...that are called determineRequiredCCInterviews
				if (
					node.key.type !== AST_NODE_TYPES.Identifier
					|| node.key.name !== "determineRequiredCCInterviews"
				) {
					return;
				}

				const requiredCCs = getRequiredInterviewCCsFromMethod(node);
				if (!requiredCCs) {
					context.report({
						node,
						loc: node.loc,
						messageId: "required-ccs-failed",
						data: {
							ccName: getCCName(currentCCId),
						},
					});
					return;
				}

				const requiredApplicationCCs = requiredCCs
					.filter((cc) => applicationCCs.includes(cc.ccId));
				if (requiredApplicationCCs.length === 0) return;

				// This is a non-application CC that depends on at least one application CC
				for (const { node, ccId } of requiredApplicationCCs) {
					context.report({
						node,
						loc: node.loc,
						messageId: "must-not-depend-on-appl-cc",
						data: {
							ccName: getCCName(currentCCId),
							applCCName: getCCName(ccId),
						},
					});
				}
			},
			"ClassDeclaration:exit"(_node) {
				currentCCId = undefined;
			},

			// =================================================================

			// To ensure correct CC API implementation, look at class declarations ending with "CCAPI"
			"ClassDeclaration[id.name=/CCAPI$/]"(
				node: TSESTree.ClassDeclaration & {
					id: TSESTree.Identifier;
				},
			) {
				// This matches the base implementations too, ignore them
				if (apiBaseClasses.has(node.id.name)) return;

				// These must...

				// ...be in a file that ends with "CC.ts"
				if (!context.filename.endsWith("CC.ts")) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "api-wrong-filename",
					});
				} else if (
					context.filename.split(path.sep).includes(
						"manufacturerProprietary",
					)
				) {
					// The rules for manufacturer proprietary CCs are different
					return;
				}

				// ...have an @API decorator
				const apiDecorator = findDecoratorContainingCCId(node, [
					"API",
				]);
				if (!apiDecorator) {
					context.report({
						node,
						loc: node.id.loc,
						messageId: "missing-api-decorator",
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
						fix: (fixer) => {
							const classKeyword = context.sourceCode
								.getTokensBefore(
									node.id,
									{
										filter: (t) =>
											t.type === "Keyword"
											&& t.value === "class",
									},
								).at(-1);

							return fixer.insertTextBefore(
								classKeyword!,
								"export ",
							);
						},
					});
				}

				// ...inherit from CCAPI or PhysicalCCAPI
				if (
					!node.superClass
					|| node.superClass.type !== AST_NODE_TYPES.Identifier
					|| !apiBaseClasses.has(
						node.superClass.name,
					)
				) {
					const createFixer = (baseClass: string) => {
						return (fixer: TSESLint.RuleFixer) =>
							node.superClass
								? fixer.replaceText(
									node.superClass,
									baseClass,
								)
								: fixer.insertTextAfter(
									node.id,
									` extends ${baseClass}`,
								);
					};
					context.report({
						node,
						loc: node.id.loc,
						messageId: "must-inherit-ccapi",
						suggest: [
							{
								messageId: "suggest-extend-ccapi",
								fix: createFixer("CCAPI"),
							},
							{
								messageId: "suggest-extend-physicalccapi",
								fix: createFixer("PhysicalCCAPI"),
							},
						],
					});
				}
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
		hasSuggestions: true,
		messages: {
			"wrong-filename":
				"Classes that end with `CC` are considered CC implementations and MUST be in a file whose name ends with `CC.ts`",
			"api-wrong-filename":
				"Classes that end with `CCAPI` are considered CC API implementations and MUST be in a file whose name ends with `CC.ts`",
			"missing-cc-decorator":
				"Classes implementing a CC must have a CC assigned using the `@commandClass(...)` decorator",
			"missing-api-decorator":
				"Classes implementing a CC API must have a CC assigned using the `@API(...)` decorator",
			"missing-version-decorator":
				"Classes implementing a CC must be decorated with `@implementedVersion(...)`",
			"must-export": "Classes implementing a CC must be exported",
			"must-export-api": "Classes implementing a CC API must be exported",
			"must-inherit-ccapi":
				"Classes implementing a CC API MUST inherit from `CCAPI` or `PhysicalCCAPI`",
			"suggest-extend-ccapi": "Inherit from `CCAPI`",
			"suggest-extend-physicalccapi": "Inherit from `PhysicalCCAPI`",
			"must-inherit-commandclass":
				"Classes implementing a CC MUST inherit from `CommandClass`",
			"required-ccs-failed":
				"Could not determine required CC interviews for `{{ccName}}`!",
			"must-not-depend-on-appl-cc":
				"Interview procedure of the non-application CC `{{ccName}}` must not depend on application CCs, but depends on `{{applCCName}}`!",
		},
	},
	defaultOptions: [],
});
