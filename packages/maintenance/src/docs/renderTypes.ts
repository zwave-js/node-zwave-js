/*!
 * Type rendering for the auto-generated CC API documentation:
 * expands utility types, classifies referenced types (link/embed/verbatim)
 * and renders type definitions for embedding into the docs pages.
 */

import {
	type EntityName,
	type ExportedDeclarations,
	type MethodDeclaration,
	Node,
	type Project,
	SyntaxKind,
	type TypeAliasDeclaration,
	TypeFormatFlags,
	type TypeLiteralNode,
	type TypeNode,
	type TypeReferenceNode,
	ts,
} from "ts-morph";

import { formatWithOxfmt } from "../oxfmt.js";

import {
	findSourceNode,
	getJsDocTagNames,
	getTransformedSource,
	isInternalMember,
} from "./shared.js";

/** How a type referenced in a rendered signature is documented */
export type TypeDocStrategy =
	// Expand the reference into an object literal shape (utility types)
	| "expand"
	// Render the type's definition on the current page
	| "embed"
	// Leave the reference alone: no link, no definition, no warning
	| "verbatim"
	// The type is documented on another page
	| { link: string };

/**
 * Central escape hatch: overrides the automatic classification by type name.
 * Everything not listed here is classified by its declaration location.
 */
export const typeRegistry: ReadonlyMap<string, TypeDocStrategy> = new Map<
	string,
	TypeDocStrategy
>([
	["Pick", "expand"],
	["Omit", "expand"],
	// Has its own documentation page instead of a single heading
	["CCAPIs", { link: "api/CCs/index" }],
	// Noise suppression: ubiquitous in value ID definitions
	["CommandClasses", "verbatim"],
	["CommandClass", "verbatim"],
	["BytesView", "verbatim"],
	["Bytes", "verbatim"],
]);

const CC_INDEX = "packages/cc/src/index.ts";

/** Matches docsify's heading id generation (src/core/render/slugify.js), sans duplicate suffixing */
export function docsifySlugify(heading: string): string {
	return heading
		.trim()
		.toLowerCase()
		.replaceAll(/<[^>]+>/g, "")
		.replaceAll(
			new RegExp(
				"[\\u2000-\\u206F\\u2E00-\\u2E7F\\\\'!\"#$%&()*+,./:;<=>?@[\\]^`{|}~]",
				"g",
			),
			"",
		)
		.replaceAll(/\s/g, "-")
		.replaceAll(/-+/g, "-")
		.replace(/^(\d)/, "_$1");
}

/** Converts a docs-relative page path plus optional heading into a docsify route */
export function docsifyRoute(pagePath: string, heading?: string): string {
	const page = pagePath.replace(/\.md$/, "");
	return heading ? `#/${page}?id=${docsifySlugify(heading)}` : `#/${page}`;
}

export interface EmbeddedType {
	name: string;
	definition: string;
	/** First paragraph of the type's JSDoc, rendered below the heading */
	description?: string;
}

interface PendingEmbeddedType extends Omit<EmbeddedType, "definition"> {
	definition: Promise<string>;
}

export interface TypeRenderContext {
	program: Project;
	/** Docsify route of the page currently being generated, e.g. "api/CCs/Basic" */
	pageRoute: string;
	/** typeName → docsify route, auto-detected from hand-written docs */
	linkTargets: ReadonlyMap<string, string>;
	/** Types to define on the current page, in insertion order */
	embeds: Map<string, PendingEmbeddedType>;
	/** All documentable types referenced on the current page → docsify route */
	referenced: Map<string, string>;
	/** Referenced types with no known documentation → declaring file path */
	unresolved: Map<string, string>;
	warnings: string[];
}

export function createTypeRenderContext(
	program: Project,
	pageRoute: string,
	linkTargets: ReadonlyMap<string, string>,
): TypeRenderContext {
	return {
		program,
		pageRoute,
		linkTargets,
		embeds: new Map(),
		referenced: new Map(),
		unresolved: new Map(),
		warnings: [],
	};
}

type Classification =
	| { kind: "ignore" }
	| { kind: "expand" }
	| { kind: "verbatim" }
	| { kind: "link"; name: string; href: string }
	| { kind: "embed"; name: string; decl?: Node }
	| { kind: "unresolved"; name: string; declPath: string };

/** Declaration kinds whose definition can be rendered into the docs */
function isDocumentableDeclaration(decl: Node): boolean {
	return (
		Node.isInterfaceDeclaration(decl)
		|| Node.isTypeAliasDeclaration(decl)
		|| Node.isEnumDeclaration(decl)
		|| Node.isClassDeclaration(decl)
	);
}

function isOwnPackageFile(filePath: string): boolean {
	return filePath.includes("/packages/") && filePath.includes("/src/");
}

function getLeftmostIdentifier(name: EntityName): Node {
	let current: Node = name;
	while (Node.isQualifiedName(current)) {
		current = current.getLeft();
	}
	return current;
}

function classifyTypeName(
	nameNode: EntityName,
	ctx: TypeRenderContext,
): Classification {
	// Qualified names like SupervisionStatus.Working are classified by the enum
	const identifier = getLeftmostIdentifier(nameNode);
	const name = identifier.getText();

	const strategy = typeRegistry.get(name);
	if (strategy === "expand") return { kind: "expand" };
	if (strategy === "verbatim") return { kind: "verbatim" };
	if (strategy === "embed") return { kind: "embed", name };
	if (typeof strategy === "object") {
		return { kind: "link", name, href: `#/${strategy.link}` };
	}

	let symbol = identifier.getSymbol();
	if (symbol && symbol.getFlags() & ts.SymbolFlags.Alias) {
		symbol = symbol.getAliasedSymbol() ?? symbol;
	}
	const decl = symbol?.getDeclarations()[0];
	if (!decl) return { kind: "ignore" };
	if (Node.isTypeParameterDeclaration(decl)) return { kind: "ignore" };

	const filePath = decl.getSourceFile().getFilePath();
	if (filePath.includes("/node_modules/")) return { kind: "ignore" };

	if (ctx.linkTargets.has(name)) {
		return { kind: "link", name, href: ctx.linkTargets.get(name)! };
	}

	// A type declared in our own packages that surfaces in a public signature is
	// part of the public API and worth documenting, even when it is not
	// re-exported from a package index (e.g. EndpointCapability)
	if (isOwnPackageFile(filePath) && isDocumentableDeclaration(decl)) {
		return { kind: "embed", name, decl };
	}

	return { kind: "unresolved", name, declPath: filePath };
}

/** The first paragraph of a declaration's JSDoc, with hard line wraps removed */
export function getJsDocDescription(node: Node): string | undefined {
	if (!Node.isJSDocable(node)) return undefined;
	const docs = node.getJsDocs();
	if (!docs.length) return undefined;
	const description = docs.at(-1)!.getDescription().trim();
	if (!description) return undefined;
	return (
		description
			.split(/\n\s*\n/)[0]
			.replaceAll(/\s*\n\s*/g, " ")
			.trim() || undefined
	);
}

export function fixTypePrinterErrors(text: string): string {
	// TS 4.2+ has some weird printing bug for aliases: https://github.com/microsoft/TypeScript/issues/43031
	return text.replaceAll(
		/(\w+) \| \("unknown" & { __brand: \1; }\)/g,
		"Maybe<$1>",
	);
}

/**
 * Makes sure the method has an explicit return type annotation, deriving it
 * from the checker for inferred return types. This lets all further
 * processing work on syntax nodes only.
 */
export function ensureReturnTypeNode(method: MethodDeclaration): void {
	if (method.getReturnTypeNode()) return;
	const text = fixTypePrinterErrors(
		method.getSignature().getReturnType().getText(method),
	);
	method.setReturnType(text);
}

/**
 * Prints the properties of a resolved object type as an object literal.
 * Returns undefined when the type cannot be represented as a single shape.
 */
function printObjectShape(
	ref: TypeReferenceNode,
	ctx: TypeRenderContext,
): string | undefined {
	const resolved = ref.getType();
	// Unions of object shapes cannot be expanded through getProperties() without
	// silently dropping variant-specific properties
	if (resolved.isUnion()) return undefined;
	// The checker returns properties in nondeterministic order; source
	// declaration order is stable and meaningful
	const props = resolved.getProperties().toSorted((a, b) => {
		const declA = a.getValueDeclaration();
		const declB = b.getValueDeclaration();
		if (declA && declB) {
			return (
				declA
					.getSourceFile()
					.getFilePath()
					.localeCompare(declB.getSourceFile().getFilePath())
				|| declA.getStart() - declB.getStart()
			);
		}
		return a.getName().localeCompare(b.getName());
	});
	if (!props.length) return undefined;

	const members: string[] = [];
	for (const prop of props) {
		const decl = prop.getValueDeclaration();
		if (
			isInternalMember(prop.getName(), decl ? getJsDocTagNames(decl) : [])
		) {
			continue;
		}

		let optional = prop.hasFlags(ts.SymbolFlags.Optional);
		let typeText: string | undefined;
		let isReadonly = false;
		let comments: string[] = [];
		if (
			decl
			&& (Node.isPropertySignature(decl)
				|| Node.isPropertyDeclaration(decl))
		) {
			typeText = decl.getTypeNode()?.getText();
			isReadonly = decl.isReadonly();
			comments = getLeadingDocComments(decl);
		} else if (decl && Node.isGetAccessorDeclaration(decl)) {
			typeText = decl.getReturnTypeNode()?.getText();
			isReadonly = prop
				.getDeclarations()
				.every((d) => !Node.isSetAccessorDeclaration(d));
			comments = getLeadingDocComments(decl);
		}
		typeText ??= fixTypePrinterErrors(
			prop
				.getTypeAtLocation(ref)
				.getText(ref, TypeFormatFlags.NoTruncation),
		);
		// Render "T | undefined" properties as optional for brevity
		if (optional || /\|\s*undefined$/.test(typeText.trim())) {
			optional = true;
			typeText = typeText.replace(/\s*\|\s*undefined\s*$/, "");
		}

		const name = /^[$A-Z_a-z][$\w]*$/.test(prop.getName())
			? prop.getName()
			: JSON.stringify(prop.getName());
		members.push(
			(comments.length ? comments.join("\n") + "\n" : "")
				+ `${isReadonly ? "readonly " : ""}${name}${
					optional ? "?" : ""
				}: ${typeText};`,
		);
	}
	if (!members.length) {
		ctx.warnings.push(
			`Expansion of ${ref.getText()} yielded no documentable properties`,
		);
		return undefined;
	}

	return `{\n${members.join("\n")}\n}`;
}

/** Expands a Pick<...> or Omit<...> reference into an object literal shape */
function expandUtilityType(
	ref: TypeReferenceNode,
	ctx: TypeRenderContext,
): string | undefined {
	const typeArgs = ref.getTypeArguments();
	if (typeArgs.length !== 2) return undefined;

	// Generic contexts cannot be resolved to concrete shapes
	const hasTypeParameter = typeArgs.some((arg) =>
		[arg, ...arg.getDescendants()]
			.filter(Node.isIdentifier)
			.some(
				(id) =>
					id
						.getSymbol()
						?.getDeclarations()
						.some(Node.isTypeParameterDeclaration) ?? false,
			),
	);
	if (hasTypeParameter) return undefined;

	return printObjectShape(ref, ctx);
}

// CC constructor options types in parameter position are inlined so callers
// see the shape directly instead of chasing a definition
const OPTIONS_TYPE_NAME = /CC\w*Options$/;

const MAX_TRANSFORM_ITERATIONS = 20;

/**
 * Applies all structural type transformations to the signature of the given
 * method or overload declaration. Returns whether anything was changed, so
 * callers can reformat only modified signatures.
 */
export function transformSignature(
	method: MethodDeclaration,
	ctx: TypeRenderContext,
): { changed: boolean } {
	ensureReturnTypeNode(method);

	// Limit transformation scope to parameter and return type annotations
	const getAnnotationRoots = () =>
		[
			...method.getParameters().map((p) => p.getTypeNode()),
			method.getReturnTypeNode(),
		].filter((n) => n != undefined);

	let changed = false;
	// References that failed their guards; keyed by text to survive node invalidation
	const skipped = new Set<string>();

	for (let i = 0; ; i++) {
		if (i >= MAX_TRANSFORM_ITERATIONS) {
			ctx.warnings.push(
				`Transformation of ${method.getName()} did not settle after ${MAX_TRANSFORM_ITERATIONS} iterations`,
			);
			break;
		}

		// Re-query on each iteration: replaceWithText invalidates captured nodes
		const roots = getAnnotationRoots();
		const target = roots
			.flatMap((root) => [
				...(Node.isTypeReference(root) ? [root] : []),
				...root.getDescendantsOfKind(SyntaxKind.TypeReference),
			])
			.find((ref) => {
				const cls = classifyTypeName(ref.getTypeName(), ctx);
				return cls.kind === "expand" && !skipped.has(ref.getText());
			});

		if (target) {
			const replacement = expandUtilityType(target, ctx);
			if (replacement) {
				target.replaceWithText(replacement);
				changed = true;
			} else {
				skipped.add(target.getText());
				// The unexpandable target type still needs to be documented
				collectReferencesFromNode(target.getTypeArguments()[0], ctx, 0);
			}
			continue;
		}

		// Inline CC options types that annotate a parameter directly
		const optionsTarget = method
			.getParameters()
			.map((p) => p.getTypeNode())
			.filter((n) => n != undefined)
			.filter(Node.isTypeReference)
			.find(
				(ref) =>
					OPTIONS_TYPE_NAME.test(
						getLeftmostIdentifier(ref.getTypeName()).getText(),
					)
					&& !ref.getTypeArguments().length
					&& !skipped.has(ref.getText()),
			);
		if (optionsTarget) {
			const replacement = printObjectShape(optionsTarget, ctx);
			if (replacement) {
				optionsTarget.replaceWithText(replacement);
				changed = true;
			} else {
				skipped.add(optionsTarget.getText());
			}
			continue;
		}

		// keyof typeof SomeObject hides the actual values; the checker
		// resolves it to the literal union
		const keyofTarget = roots
			.flatMap((root) => [
				...(Node.isTypeOperatorTypeNode(root) ? [root] : []),
				...root.getDescendantsOfKind(SyntaxKind.TypeOperator),
			])
			.find(
				(op) =>
					op.getOperator() === SyntaxKind.KeyOfKeyword
					&& op.getTypeNode().getKind() === SyntaxKind.TypeQuery
					&& !skipped.has(op.getText()),
			);
		if (keyofTarget) {
			const resolved = fixTypePrinterErrors(
				keyofTarget
					.getType()
					.getText(keyofTarget, TypeFormatFlags.NoTruncation),
			);
			if (resolved.includes("keyof") || resolved.length > 200) {
				skipped.add(keyofTarget.getText());
			} else {
				keyofTarget.replaceWithText(resolved);
				changed = true;
			}
			continue;
		}

		// Instance field references like SomeCCReport["commands"] hide the
		// actual type; the checker resolves them
		const indexedTarget = roots
			.flatMap((root) => [
				...(Node.isIndexedAccessTypeNode(root) ? [root] : []),
				...root.getDescendantsOfKind(SyntaxKind.IndexedAccessType),
			])
			.find((node) => !skipped.has(node.getText()));
		if (!indexedTarget) break;

		const resolvedIndexed = fixTypePrinterErrors(
			indexedTarget
				.getType()
				.getText(indexedTarget, TypeFormatFlags.NoTruncation),
		);
		if (
			/[[{]\s*$|keyof |typeof /.test(resolvedIndexed)
			|| resolvedIndexed.length > 200
		) {
			skipped.add(indexedTarget.getText());
			continue;
		}
		indexedTarget.replaceWithText(resolvedIndexed);
		changed = true;
	}

	for (const root of getAnnotationRoots()) {
		collectReferencesFromNode(root, ctx, 0);
	}
	return { changed };
}

const MAX_EMBED_DEPTH = 3;
const MAX_EMBEDS_PER_PAGE = 32;

/** Classifies all type references below the node and accumulates links/embeds */
export function collectReferencesFromNode(
	node: Node,
	ctx: TypeRenderContext,
	depth: number,
): void {
	const refs = [
		...(Node.isTypeReference(node) ? [node] : []),
		...node.getDescendantsOfKind(SyntaxKind.TypeReference),
	];
	for (const ref of refs) {
		const cls = classifyTypeName(ref.getTypeName(), ctx);
		switch (cls.kind) {
			case "link":
				ctx.referenced.set(cls.name, cls.href);
				break;
			case "embed":
				addEmbed(cls.name, ctx, depth, cls.decl);
				break;
			case "unresolved":
				ctx.unresolved.set(cls.name, cls.declPath);
				break;
		}
	}
}

function addEmbed(
	name: string,
	ctx: TypeRenderContext,
	depth: number,
	decl?: Node,
): void {
	if (ctx.embeds.has(name)) return;
	if (depth >= MAX_EMBED_DEPTH) {
		ctx.warnings.push(
			`Embed depth limit reached at type ${name}; it will be referenced without a definition`,
		);
		ctx.unresolved.set(name, "(embed depth limit)");
		return;
	}
	if (ctx.embeds.size >= MAX_EMBEDS_PER_PAGE) {
		ctx.warnings.push(
			`Embed count limit reached at type ${name}; it will be referenced without a definition`,
		);
		ctx.unresolved.set(name, "(embed count limit)");
		return;
	}

	const sourceNode = decl ?? resolveDeclByName(ctx.program, name);
	if (!sourceNode) {
		ctx.unresolved.set(name, "(no resolvable declaration)");
		return;
	}

	const definition = getTransformedSource(
		sourceNode as ExportedDeclarations,
		{ comments: true, jsdoc: true },
	);
	ctx.embeds.set(name, {
		name,
		definition,
		description: getJsDocDescription(sourceNode),
	});
	ctx.referenced.set(name, docsifyRoute(ctx.pageRoute, name));

	// Embedded definitions may reference further documentable types.
	// Classes are printed as property-only interface views, so only the
	// property types may contribute references
	if (Node.isClassDeclaration(sourceNode)) {
		for (const prop of sourceNode.getInstanceProperties()) {
			if (
				prop.hasModifier(SyntaxKind.PrivateKeyword)
				|| prop.hasModifier(SyntaxKind.ProtectedKeyword)
			) {
				continue;
			}
			const typeNode = Node.isGetAccessorDeclaration(prop)
				? prop.getReturnTypeNode()
				: Node.isSetAccessorDeclaration(prop)
					? prop.getParameters()[0]?.getTypeNode()
					: prop.getTypeNode();
			if (typeNode) {
				collectReferencesFromNode(typeNode, ctx, depth + 1);
			}
		}
	} else {
		collectReferencesFromNode(sourceNode, ctx, depth + 1);
	}
}

// Compound parameter types are rendered as one synthetic overload per variant.
// Distribution is bounded so the result stays readable.
const MAX_DISTRIBUTED_VARIANTS = 4;
const MAX_ALIAS_INLINE_DEPTH = 2;
const MAX_DISTRIBUTED_LENGTH = 2000;

type Atom =
	| {
			kind: "literal";
			node: TypeLiteralNode;
			// Set for literals that are a union member: their leading comment
			// describes the whole variant
			variantRoot?: boolean;
	  }
	// Named types and anything else that stays as written
	| { kind: "ref"; text: string };

/** A variant is one product term of the distributed union: A & B & ... */
type Variant = Atom[];

const ALIAS_SOURCES = [
	CC_INDEX,
	"packages/core/src/index.ts",
	"packages/shared/src/index.ts",
];

function resolveTypeAliasByName(
	program: Project,
	name: string,
): TypeAliasDeclaration | undefined {
	for (const source of ALIAS_SOURCES) {
		const node = findSourceNode(program, source, name);
		if (node && Node.isTypeAliasDeclaration(node)) return node;
	}
	return undefined;
}

/** Resolves a type name to its declaration via the package indexes */
export function resolveDeclByName(
	program: Project,
	name: string,
): ExportedDeclarations | undefined {
	for (const source of ALIAS_SOURCES) {
		const node = findSourceNode(program, source, name);
		if (node) return node;
	}
	return undefined;
}

/**
 * Distributes intersections over unions into a list of product terms.
 * Returns undefined when the type is too complex to distribute safely.
 */
function distributeTypeNode(
	node: TypeNode,
	ctx: TypeRenderContext,
	depth: number,
): Variant[] | undefined {
	if (Node.isParenthesizedTypeNode(node)) {
		return distributeTypeNode(node.getTypeNode(), ctx, depth);
	}
	if (Node.isUnionTypeNode(node)) {
		const variants: Variant[] = [];
		for (const member of node.getTypeNodes()) {
			const inner = distributeTypeNode(member, ctx, depth);
			if (!inner) return undefined;
			for (const variant of inner) {
				const firstLiteral = variant.find((a) => a.kind === "literal");
				if (firstLiteral && firstLiteral.kind === "literal") {
					firstLiteral.variantRoot = true;
				}
			}
			variants.push(...inner);
			if (variants.length > MAX_DISTRIBUTED_VARIANTS) return undefined;
		}
		return variants;
	}
	if (Node.isIntersectionTypeNode(node)) {
		let variants: Variant[] = [[]];
		for (const member of node.getTypeNodes()) {
			const inner = distributeTypeNode(member, ctx, depth);
			if (!inner) return undefined;
			const product: Variant[] = [];
			for (const left of variants) {
				for (const right of inner) {
					product.push([...left, ...right]);
				}
			}
			if (product.length > MAX_DISTRIBUTED_VARIANTS) return undefined;
			variants = product;
		}
		return variants;
	}
	if (Node.isTypeLiteral(node)) {
		return [[{ kind: "literal", node }]];
	}
	if (Node.isTypeReference(node)) {
		const name = getLeftmostIdentifier(node.getTypeName()).getText();
		// AllOrNone<T> means: either all of T's properties, or none of them.
		// The "none" branch comes first so the simplest call shape is listed first
		if (name === "AllOrNone" && node.getTypeArguments().length === 1) {
			const inner = distributeTypeNode(
				node.getTypeArguments()[0],
				ctx,
				depth,
			);
			if (!inner) return undefined;
			return [[], ...inner];
		}
		if (depth < MAX_ALIAS_INLINE_DEPTH) {
			const alias = resolveTypeAliasByName(ctx.program, name);
			// Only aliases containing object shapes are worth flattening;
			// unions of named types (e.g. ColorTable) read better by name
			if (
				alias
				&& !alias.getTypeParameters().length
				&& alias.getTypeNode()
				&& (Node.isTypeLiteral(alias.getTypeNodeOrThrow())
					|| alias
						.getTypeNodeOrThrow()
						.getDescendantsOfKind(SyntaxKind.TypeLiteral).length
						> 0)
			) {
				return distributeTypeNode(
					alias.getTypeNodeOrThrow(),
					ctx,
					depth + 1,
				);
			}
		}
		return [[{ kind: "ref", text: node.getText() }]];
	}
	return [[{ kind: "ref", text: node.getText() }]];
}

function isDiscriminatorMember(member: Node): boolean {
	return (
		Node.isPropertySignature(member)
		&& member.hasQuestionToken()
		&& member.getTypeNode()?.getKind() === SyntaxKind.UndefinedKeyword
	);
}

function getLeadingCommentLines(member: Node): string[] {
	const fullText = member.getFullText();
	const trivia = fullText.slice(0, fullText.length - member.getText().length);
	return trivia
		.split("\n")
		.map((line) => line.trim())
		.filter((line) => line.startsWith("//"));
}

/** Leading JSDoc blocks and line comments of a declaration, in source order */
function getLeadingDocComments(node: Node): string[] {
	const comments: string[] = [];
	if (Node.isJSDocable(node)) {
		comments.push(...node.getJsDocs().map((doc) => doc.getText()));
	}
	for (const range of node.getLeadingCommentRanges()) {
		if (range.getKind() === SyntaxKind.SingleLineCommentTrivia) {
			comments.push(range.getText());
		}
	}
	return comments;
}

interface RenderedVariant {
	typeText: string;
	/** Comments describing the whole variant, rendered above the overload */
	promotedComments: string[];
	/** The variant has no properties at all; the parameter is omitted */
	empty?: boolean;
}

function renderVariant(variant: Variant): RenderedVariant | undefined {
	const refs: string[] = [];
	const memberLines: string[] = [];
	const promotedComments: string[] = [];

	for (const atom of variant) {
		if (atom.kind === "ref") {
			refs.push(atom.text);
			continue;
		}
		const members = atom.node.getMembers();
		for (const [index, member] of members.entries()) {
			const comments = getLeadingCommentLines(member);
			// Promote comments from discriminator properties and leading
			// union members above the overload
			if (isDiscriminatorMember(member)) {
				promotedComments.push(...comments);
				continue;
			}
			if (index === 0 && atom.variantRoot && comments.length) {
				promotedComments.push(...comments);
				memberLines.push(member.getText());
				continue;
			}
			memberLines.push(
				(comments.length ? comments.join("\n") + "\n" : "")
					+ member.getText(),
			);
		}
	}

	// The "none" branch of AllOrNone: no properties at all
	if (!variant.length) {
		return { typeText: "", promotedComments: [], empty: true };
	}
	// A variant without any object shape (e.g. Duration | string) is a plain union
	if (!variant.some((a) => a.kind === "literal")) return undefined;

	const literalText = `{\n${memberLines.join("\n")}\n}`;
	const typeText = refs.length
		? `${refs.join(" & ")}${memberLines.length ? ` & ${literalText}` : ""}`
		: literalText;
	return { typeText, promotedComments };
}

export interface DistributedParameter {
	parameterIndex: number;
	variants: RenderedVariant[];
}

/**
 * Detects a single compound options parameter (union of object shapes,
 * possibly behind a type alias and/or AllOrNone) and renders one parameter
 * type per variant, so the method can be documented as synthetic overloads.
 */
export function tryDistributeCompoundParameter(
	method: MethodDeclaration,
	ctx: TypeRenderContext,
): DistributedParameter | undefined {
	const candidates: DistributedParameter[] = [];

	for (const [index, param] of method.getParameters().entries()) {
		const typeNode = param.getTypeNode();
		if (!typeNode) continue;
		const variants = distributeTypeNode(typeNode, ctx, 0);
		if (!variants || variants.length < 2) continue;

		const rendered = variants.map(renderVariant);
		if (rendered.some((v) => v == undefined)) continue;
		// An empty variant is rendered by omitting the parameter, which only
		// works when the parameter is optional
		if (rendered.some((v) => v!.empty) && !param.hasQuestionToken()) {
			continue;
		}
		const total = rendered.reduce((sum, v) => sum + v!.typeText.length, 0);
		if (total > MAX_DISTRIBUTED_LENGTH) {
			ctx.warnings.push(
				`Not distributing parameter ${param.getName()} of ${method.getName()} into overloads: the result would be too long`,
			);
			continue;
		}

		candidates.push({
			parameterIndex: index,
			variants: rendered as RenderedVariant[],
		});
	}

	if (candidates.length === 1) return candidates[0];
	if (candidates.length > 1) {
		ctx.warnings.push(
			`Method ${method.getName()} has multiple compound parameters; not distributing into overloads`,
		);
	}
	return undefined;
}

let ccIndexExportNames: ReadonlySet<string> | undefined;

function getCCIndexExportNames(program: Project): ReadonlySet<string> {
	ccIndexExportNames ??= new Set(
		program.getSourceFile(CC_INDEX)?.getExportedDeclarations().keys() ?? [],
	);
	return ccIndexExportNames;
}

/**
 * Scans checker-printed text (e.g. value ID types) for documentable type
 * names. Signatures have syntax nodes and use classifyTypeName instead.
 */
export function collectTypeNamesFromText(
	text: string,
	ctx: TypeRenderContext,
): void {
	// Strip string literals so their contents aren't matched as type names
	const withoutStrings = text.replaceAll(/"(?:[^"\\]|\\.)*"/g, '""');
	const ccExports = getCCIndexExportNames(ctx.program);
	for (const match of withoutStrings.matchAll(/\b[A-Z]\w*\b/g)) {
		const name = match[0];
		const strategy = typeRegistry.get(name);
		if (strategy === "verbatim" || strategy === "expand") continue;
		if (typeof strategy === "object") {
			ctx.referenced.set(name, `#/${strategy.link}`);
		} else if (ctx.linkTargets.has(name)) {
			ctx.referenced.set(name, ctx.linkTargets.get(name)!);
		} else if (ccExports.has(name)) {
			addEmbed(name, ctx, 0);
		}
	}
}

const formattedSignatureCache = new Map<string, Promise<string>>();

export function formatTransformedSignature(signature: string): Promise<string> {
	let formattedSignature = formattedSignatureCache.get(signature);
	if (!formattedSignature) {
		formattedSignature = (async () => {
			const wrapped = `class __C {\n${signature}\n}`;
			const formatted = (
				await formatWithOxfmt("signature.ts", wrapped)
			).trim();
			return formatted
				.split("\n")
				.slice(1, -1)
				.map((line) => line.replace(/^\t/, ""))
				.join("\n");
		})();
		formattedSignatureCache.set(signature, formattedSignature);
	}
	return formattedSignature;
}

export async function resolveEmbeddedTypes(
	ctx: TypeRenderContext,
): Promise<EmbeddedType[]> {
	return Promise.all(
		[...ctx.embeds.values()].map(async (embed) => ({
			...embed,
			definition: await embed.definition,
		})),
	);
}

/** Renders the "Related types" section for all types embedded on a page */
export function renderEmbeddedTypesSection(
	embeds: readonly EmbeddedType[],
): string {
	if (!embeds.length) return "";
	const sorted = embeds.toSorted((a, b) => a.name.localeCompare(b.name));
	let text = "## Related types\n\n";
	for (const embed of sorted) {
		text += `### \`${embed.name}\`\n\n`;
		if (embed.description) text += `${embed.description}\n\n`;
		text += `\`\`\`ts\n${embed.definition}\n\`\`\`\n\n`;
	}
	return text;
}
