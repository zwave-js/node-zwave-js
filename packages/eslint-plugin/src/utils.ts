import {
	AST_NODE_TYPES,
	type TSESLint,
	type TSESTree,
} from "@typescript-eslint/utils";
import { CommandClasses } from "@zwave-js/core";
import { type Rule as ESLintRule } from "eslint";
import { type AST as JSONC_AST, type RuleListener } from "jsonc-eslint-parser";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export type ReportFixGenerator = (
	fixer: ESLintRule.RuleFixer,
) => Generator<ESLintRule.Fix, void, unknown>;

export const repoRoot = path.normalize(
	__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)),
);

/** Finds a specific decorator on a node */
export function findDecorator(
	node: TSESTree.ClassDeclaration,
	name: string,
): TSESTree.Decorator | undefined {
	return node.decorators.find((d) =>
		d.expression.type === AST_NODE_TYPES.CallExpression
		&& d.expression.callee.type === AST_NODE_TYPES.Identifier
		&& d.expression.callee.name === name
	);
}

/** Finds the `@API(...)` or `@commandClass(...)` decorator on a node */
export function findDecoratorContainingCCId(
	node: TSESTree.ClassDeclaration,
	possibleNames: string[] = ["API", "commandClass"],
): TSESTree.Decorator | undefined {
	return node.decorators.find((d) =>
		d.expression.type === AST_NODE_TYPES.CallExpression
		&& d.expression.callee.type === AST_NODE_TYPES.Identifier
		&& possibleNames.includes(d.expression.callee.name)
		&& d.expression.arguments.length === 1
		&& d.expression.arguments[0].type
			=== AST_NODE_TYPES.MemberExpression
		&& d.expression.arguments[0].object.type
			=== AST_NODE_TYPES.Identifier
		&& d.expression.arguments[0].object.name
			=== "CommandClasses"
		&& (d.expression.arguments[0].property.type
				=== AST_NODE_TYPES.Identifier
			|| (d.expression.arguments[0].property.type
					=== AST_NODE_TYPES.Literal
				&& typeof d.expression.arguments[0].property.value
					=== "string"))
	);
}

/** Takes a member expression (should be CommandClasses["..."]) and returns the name of the CC accessed by it */
export function getCCNameFromExpression(
	expression: TSESTree.MemberExpression,
): string | undefined {
	if (
		expression.object.type
			!== AST_NODE_TYPES.Identifier
		|| expression.object.name
			!== "CommandClasses"
	) {
		return;
	}

	if (expression.property.type === AST_NODE_TYPES.Identifier) {
		return expression.property.name;
	} else if (
		expression.property.type === AST_NODE_TYPES.Literal
		&& typeof expression.property.value === "string"
	) {
		return expression.property.value;
	}
}

/** Takes a member expression (should be CommandClasses["..."]) and returns the CC ID accessed by it */
export function getCCIdFromExpression(
	expression: TSESTree.MemberExpression,
): CommandClasses | undefined {
	const name = getCCNameFromExpression(expression);
	if (!name) return;
	return (CommandClasses as any)[name];
}

/** Takes a decorator found using {@link findDecoratorContainingCCId} and returns the CC name */
export function getCCNameFromDecorator(
	decorator: TSESTree.Decorator,
): string {
	return getCCNameFromExpression((decorator.expression as any).arguments[0])!;
}

/** Takes a decorator found using {@link findDecoratorContainingCCId} and returns the CC ID */
export function getCCIdFromDecorator(
	decorator: TSESTree.Decorator,
): CommandClasses {
	return (CommandClasses as any)[getCCNameFromDecorator(decorator)];
}

export type Rule = TSESLint.RuleModule<any, never[], TSESLint.RuleListener>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSONCRule {
	// Special ESLint rule type for JSONC files
	// AST viewer at https://ota-meshi.github.io/jsonc-eslint-parser/

	export interface RuleModule {
		meta: RuleMetaData;
		jsoncDefineRule: PartialRuleModule;
		create(context: ESLintRule.RuleContext): RuleListener;
	}

	export interface RuleMetaData {
		docs: {
			description: string;
			recommended: ("json" | "jsonc" | "json5")[] | null;
			url: string;
			ruleId: string;
			ruleName: string;
			default?: "error" | "warn";
			extensionRule:
				| boolean
				| string
				| {
					plugin: string;
					url: string;
				};
			layout: boolean;
		};
		messages: { [messageId: string]: string };
		fixable?: "code" | "whitespace";
		hasSuggestions?: boolean;
		schema: false /*| JSONSchema4 | JSONSchema4[]*/;
		deprecated?: boolean;
		replacedBy?: [];
		type: "problem" | "suggestion" | "layout";
	}

	export interface PartialRuleModule {
		meta: PartialRuleMetaData;
		create(
			context: ESLintRule.RuleContext,
			params: { customBlock: boolean },
		): RuleListener;
	}

	export interface PartialRuleMetaData {
		docs: {
			description: string;
			recommended: ("json" | "jsonc" | "json5")[] | null;
			default?: "error" | "warn";
			extensionRule:
				| boolean
				| string
				| {
					plugin: string;
					url: string;
				};
			layout: boolean;
		};
		messages: { [messageId: string]: string };
		fixable?: "code" | "whitespace";
		hasSuggestions?: boolean;
		schema: false; /* | JSONSchema4 | JSONSchema4[]*/
		deprecated?: boolean;
		replacedBy?: [];
		type: "problem" | "suggestion" | "layout";
	}
}

function getPropertyStartIncludingComments(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
): number {
	const propIndex = property.parent.properties.indexOf(property);
	const prevProp = property.parent.properties[propIndex - 1];

	// Trailing comments of the previous property may get attributed to this one
	let leadingComments = context.sourceCode.getCommentsBefore(property as any);
	if (prevProp) {
		leadingComments = leadingComments.filter((c) =>
			c.loc?.start.line !== prevProp.loc.end.line
		);
	}

	return Math.min(
		property.range[0],
		...leadingComments.map((c) => c.range![0]),
	);
}

function getPropertyEndIncludingComments(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
): number {
	const propIndex = property.parent.properties.indexOf(property);
	const nextProp = property.parent.properties[propIndex + 1];

	// Trailing comments may get attributed to the next property
	const trailingComments = [
		...context.sourceCode.getCommentsAfter(
			property as any,
		),
	];
	if (nextProp) {
		trailingComments.push(
			...context.sourceCode.getCommentsBefore(
				nextProp as any,
			).filter((c) => c.loc?.start.line === property.loc.end.line),
		);
	}

	return Math.max(
		property.range[1],
		...trailingComments.map((c) => c.range![1]),
	);
}

function getFullPropertyRangeIncludingComments(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
): [number, number] {
	const propIndex = property.parent.properties.indexOf(property);
	const prevProp = property.parent.properties[propIndex - 1];
	const nextProp = property.parent.properties[propIndex + 1];

	// The full range of a property including comments depends on the surrounding properties
	// If there is a next property, it goes from
	// ...either the start of the property or its first leading comment
	// ...to the start of the next property or its first leading comment
	// If not and there is a previous property, it goes from
	// ...either the end of the previous property or its last trailing comment
	// ...to the end of the last trailing comment of the current property

	if (nextProp) {
		return [
			getPropertyStartIncludingComments(context, property),
			getPropertyStartIncludingComments(context, nextProp),
		];
	} else if (prevProp) {
		return [
			getPropertyEndIncludingComments(context, prevProp),
			getPropertyEndIncludingComments(context, property),
		];
	} else {
		return [
			getPropertyStartIncludingComments(context, property),
			getPropertyEndIncludingComments(context, property),
		];
	}
}

export function removeJSONProperty(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
): ESLintRule.ReportFixer {
	return (fixer) =>
		fixer.removeRange(
			getFullPropertyRangeIncludingComments(context, property),
		);
}

export function insertBeforeJSONProperty(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
	text: string,
	options: {
		indent?: boolean;
		ownLine?: boolean;
		isComment?: boolean;
	} = {},
): ReportFixGenerator {
	const { indent = true, ownLine = true, isComment = false } = options;
	let actualStart: number;
	if (isComment) {
		// Prevent inserting the comment after the previous property's trailing comma
		// TODO: getFullPropertyRangeIncludingComments should take this into account
		actualStart = getPropertyStartIncludingComments(context, property);
	} else {
		[actualStart] = getFullPropertyRangeIncludingComments(
			context,
			property,
		);
	}
	let suffix = "";

	// If desired, try to fix the indentation before/after the inserted text
	if (indent) {
		suffix = getJSONIndentationAtNode(context, property);
	}

	// If desired, put the inserted text on its own line
	if (ownLine) {
		suffix = "\n" + suffix;
	}

	return function*(fixer) {
		yield fixer.insertTextBeforeRange([
			actualStart,
			actualStart,
		], text + suffix);
	};
}

export function insertAfterJSONProperty(
	context: ESLintRule.RuleContext,
	property: JSONC_AST.JSONProperty,
	text: string,
	options: {
		insertComma?: boolean;
		indent?: boolean;
		ownLine?: boolean;
	} = {},
): ReportFixGenerator {
	const { indent = true, ownLine = true, insertComma = false } = options;
	const [, actualEnd] = getFullPropertyRangeIncludingComments(
		context,
		property,
	);
	const nextProp = property.parent.properties[
		property.parent.properties.indexOf(property) + 1
	];
	let prefix = "";
	let suffix = "";

	// If desired, try to fix the indentation before/after the inserted text
	if (indent) {
		if (nextProp) {
			suffix = getJSONIndentationAtNode(context, nextProp);
		} else {
			prefix = getJSONIndentationAtNode(context, property);
		}
	}

	// If desired, put the inserted text on its own line
	if (ownLine) {
		if (nextProp) {
			suffix = "\n" + suffix;
		} else {
			prefix = "\n" + prefix;
		}
	}

	return function*(fixer) {
		if (insertComma && !nextProp) {
			yield fixer.insertTextAfter(property as any, ",");
		}
		yield fixer.insertTextAfterRange([
			actualEnd,
			actualEnd,
		], prefix + text + suffix);
	};
}

export function getJSONNumber(
	obj: JSONC_AST.JSONObjectExpression,
	key: string,
):
	| {
		node: JSONC_AST.JSONProperty & { value: JSONC_AST.JSONNumberLiteral };
		value: number;
	}
	| undefined
{
	const prop = obj.properties.find((p) =>
		p.key.type === "JSONLiteral"
		&& p.key.value === key
	);
	if (!prop) return;
	if (
		prop.value.type === "JSONLiteral"
		&& typeof prop.value.value === "number"
	) {
		return {
			// @ts-expect-error The JSONNumberLiteral has non-optional properties that we don't care for
			node: prop,
			value: prop.value.value,
		};
	}
}

export function getJSONBoolean(
	obj: JSONC_AST.JSONObjectExpression,
	key: string,
):
	| {
		node: JSONC_AST.JSONProperty & {
			value: JSONC_AST.JSONKeywordLiteral & {
				value: boolean;
			};
		};
		value: boolean;
	}
	| undefined
{
	const prop = obj.properties.find((p) =>
		p.key.type === "JSONLiteral"
		&& p.key.value === key
	);
	if (!prop) return;
	if (
		prop.value.type === "JSONLiteral"
		&& typeof prop.value.value === "boolean"
	) {
		return {
			// @ts-expect-error The JSONKeywordLiteral has non-optional properties that we don't care for
			node: prop,
			value: prop.value.value,
		};
	}
}

export function getJSONString(
	obj: JSONC_AST.JSONObjectExpression,
	key: string,
):
	| {
		node: JSONC_AST.JSONProperty & { value: JSONC_AST.JSONStringLiteral };
		value: string;
	}
	| undefined
{
	const prop = obj.properties.find((p) =>
		p.key.type === "JSONLiteral"
		&& p.key.value === key
	);
	if (!prop) return;
	if (
		prop.value.type === "JSONLiteral"
		&& typeof prop.value.value === "string"
	) {
		return {
			// @ts-expect-error The JSONStringLiteral has non-optional properties that we don't care for
			node: prop,
			value: prop.value.value,
		};
	}
}

export function getJSONIndentationAtNode(
	context: ESLintRule.RuleContext,
	node: JSONC_AST.JSONNode,
): string {
	return context.sourceCode
		.getLines()[node.loc.start.line - 1]
		.slice(
			0,
			node.loc.start.column,
		);
}

export const paramInfoPropertyOrder: string[] = [
	"#",
	"$if",
	"$import",
	"label",
	"description",
	"valueSize",
	"unit",
	"minValue",
	"maxValue",
	"defaultValue",
	"unsigned",
	"readOnly",
	"writeOnly",
	"allowManualEntry",
	"options",
];
