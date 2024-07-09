import { type AST as ESLintAST } from "eslint";
import type { AST } from "jsonc-eslint-parser";
import { type JSONCRule, paramInfoPropertyOrder } from "../utils";

export const consistentDeviceConfigPropertyOrder: JSONCRule.RuleModule = {
	create(context) {
		if (!context.parserServices.isJSON) {
			return {};
		}
		return {
			// Ensure consistent ordering of properties in configuration parameters
			"JSONProperty[key.value='paramInformation'] > JSONArrayExpression > JSONObjectExpression"(
				node: AST.JSONObjectExpression,
			) {
				const properties = node.properties.map((p) => {
					if (p.key.type !== "JSONLiteral") {
						return undefined;
					} else {
						return [
							paramInfoPropertyOrder.indexOf(p.key.value as any),
							p,
						] as const;
					}
				}).filter((p) => !!p);

				const isSomePropertyOutOfOrder = properties.some(
					([index], i, arr) => i > 0 && index < arr[i - 1][0],
				);

				if (isSomePropertyOutOfOrder) {
					const propsWithComments = properties.map(([index, p]) => {
						const comments = context.sourceCode.getComments(
							p as any,
						);
						return {
							index,
							property: p,
							comments,
						};
					});

					// Eslint considers trailing comments in the same line as a property
					// to be a leading comment of the next. We don't want that.
					for (let i = 1; i < propsWithComments.length; i++) {
						const prev = propsWithComments[i - 1];
						const cur = propsWithComments[i];
						const wronglyAttributedComments = cur.comments.leading
							.filter(
								(c) =>
									c.loc?.start.line
										=== prev.property.loc.end.line,
							);
						prev.comments.trailing.push(
							...wronglyAttributedComments,
						);
						cur.comments.leading = cur.comments.leading.filter(
							(c) => !wronglyAttributedComments.includes(c),
						);
					}

					const withRanges = propsWithComments.map((prop) => {
						const start = Math.min(
							prop.property.range[0],
							...prop.comments.leading.map((c) => c.range![0]),
						);
						const end = Math.max(
							prop.property.range[1],
							...prop.comments.trailing.map((c) => c.range![1]),
						);
						return {
							...prop,
							start,
							end,
						};
					});

					const indentation = context.sourceCode
						.getLines()[withRanges[0].property.loc.start.line]
						.slice(
							0,
							withRanges[0].property.loc.start.column,
						);
					// TODO: Change to .toSorted() once on node 20.
					const desiredOrder = [...propsWithComments].sort((a, b) =>
						a.index - b.index
					).map((prop) => {
						const start = Math.min(
							prop.property.range[0],
							...prop.comments.leading.map((c) => c.range![0]),
						);
						const end = Math.max(
							prop.property.range[1],
							...prop.comments.trailing.map((c) => c.range![1]),
						);
						return {
							...prop,
							start,
							end,
						};
					});
					let desiredText = "";
					for (let i = 0; i < desiredOrder.length; i++) {
						const prop = desiredOrder[i];
						if (i > 0) desiredText += "\n" + indentation;
						// To include trailing commas where necessary, slice twice:
						// 1. From the start of the first comment to the end of the property
						// 2. From the end of the property to the end of the last column
						const part1 = context.sourceCode.getText().slice(
							prop.start,
							prop.property.range[1],
						);
						let part2 = context.sourceCode.getText().slice(
							prop.property.range[1],
							prop.end,
						);
						desiredText += part1;
						if (
							// Needs trailing comma
							i < desiredOrder.length - 1
							// and has none
							&& !part2.startsWith(",")
						) {
							desiredText += ",";
						} else if (
							// Needs no trailing comma
							i === desiredOrder.length - 1
							// but has one
							&& part2.startsWith(",")
						) {
							part2 = part2.slice(1);
						}
						desiredText += part2;
					}

					const replaceRange: ESLintAST.Range = [
						withRanges[0].start,
						withRanges.at(-1)!.end,
					];

					context.report({
						loc: node.loc,
						messageId: "parameter-ordering",
						fix(fixer) {
							return fixer.replaceTextRange(
								replaceRange,
								desiredText,
							);
						},
					});
					return;
				}
			},
		};
	},
	meta: {
		docs: {
			description:
				"Ensures consistent ordering of properties in configuration parameter definitions",
		},
		fixable: "code",
		schema: [],
		messages: {
			"parameter-ordering":
				`For consistency, config param properties should follow the order ${
					paramInfoPropertyOrder.map((p) => `"${p}"`).join(", ")
				}.`,
		},
		type: "problem",
	},
};
