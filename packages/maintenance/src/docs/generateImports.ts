/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import { fs } from "@zwave-js/core/bindings/fs/node";
import { enumFilesRecursive } from "@zwave-js/shared";
import c from "ansi-colors";
import esMain from "es-main";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMainThread } from "node:worker_threads";
import { Piscina } from "piscina";
import {
	type CommentRange,
	type ExportedDeclarations,
	type InterfaceDeclaration,
	type InterfaceDeclarationStructure,
	Node,
	type OptionalKind,
	Project,
	type PropertySignatureStructure,
	SyntaxKind,
	type TypeLiteralNode,
} from "ts-morph";
import { formatWithDprint } from "../dprint.js";
import {
	projectRoot,
	tsConfigFilePathForDocs as tsConfigFilePath,
} from "../tsAPITools.js";

// Support directly loading this file in a worker
import { register } from "tsx/esm/api";
register();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const exportDeclarationCache = new Map<
	string,
	ReadonlyMap<string, ExportedDeclarations[]>
>();

export function findSourceNode(
	program: Project,
	exportingFile: string,
	identifier: string,
): ExportedDeclarations | undefined {
	// Scan all source files
	if (!exportDeclarationCache.has(exportingFile)) {
		const decls = program.getSourceFile(exportingFile)
			?.getExportedDeclarations();
		if (decls) exportDeclarationCache.set(exportingFile, decls);
	}
	return exportDeclarationCache.get(exportingFile)
		?.get(identifier)?.[0];
}

function stripComments(
	node: ExportedDeclarations,
	options: ImportRange["options"],
): ExportedDeclarations {
	if (Node.isTextInsertable(node)) {
		// Remove some comments if desired
		const ranges: { pos: number; end: number }[] = [];
		const removePredicate = (c: CommentRange) =>
			(!options.comments
				&& c.getKind() === SyntaxKind.SingleLineCommentTrivia)
			|| (!options.jsdoc
				&& c.getKind() === SyntaxKind.MultiLineCommentTrivia);

		const getCommentRangesForNode = (
			node: Node,
		): { pos: number; end: number }[] => {
			const comments = node.getLeadingCommentRanges();
			const ret = comments.map((c, i) => ({
				pos: c.getPos(),
				end: i < comments.length - 1
					? comments[i + 1].getPos()
					: Math.max(node.getStart(), c.getEnd()),
				remove: removePredicate(c),
			}));
			// Only use comment ranges that should be removed
			return ret.filter((r) => r.remove);
		};

		if (Node.isEnumDeclaration(node)) {
			for (const member of node.getMembers()) {
				ranges.push(...getCommentRangesForNode(member));
			}
		} else if (Node.isInterfaceDeclaration(node)) {
			const walkInterfaceDeclaration = (node: InterfaceDeclaration) => {
				for (const member of node.getMembers()) {
					ranges.push(...getCommentRangesForNode(member));
					if (Node.isInterfaceDeclaration(member)) {
						walkInterfaceDeclaration(member);
					}
				}
			};
			walkInterfaceDeclaration(node);
		}

		// Sort in reverse order, so the removals don't influence each other
		ranges.sort((a, b) => b.pos - a.pos);
		for (const { pos, end } of ranges) {
			node.removeText(pos, end);
		}
	}
	return node;
}

function shouldStripPropertySignature(
	p: OptionalKind<PropertySignatureStructure>,
): boolean {
	return !!p.docs?.some(
		(d) =>
			typeof d !== "string"
			&& d.tags?.some((t) => /(deprecated|internal)/.test(t.tagName)),
	);
}

// As long as ts-morph has no means to print a structure, we'll have to use this
// to print the declarations of a class
function printInterfaceDeclarationStructure(
	struct: InterfaceDeclarationStructure,
): string {
	return `
interface ${struct.name}${
		struct.typeParameters?.length
			// eslint-disable-next-line @typescript-eslint/no-base-to-string
			? `<${struct.typeParameters.map((t) => t.toString()).join(", ")}>`
			: ""
	} {
	${
		struct.properties
			?.filter((p) => !shouldStripPropertySignature(p))
			.map((p) => {
				return `${p.isReadonly ? "readonly " : ""}${p.name}${
					p.hasQuestionToken ? "?:" : ":"
				} ${p.type as string};`;
			})
			.join("\n")
	}
}`;
}

export function getTransformedSource(
	node: ExportedDeclarations,
	options: ImportRange["options"],
): string {
	// Create a temporary project with a temporary source file to print the node
	const project = new Project();
	const sourceFile = project.createSourceFile("index.ts", node.getText());
	node = [
		...sourceFile.getExportedDeclarations().values(),
	][0][0];

	// Remove @internal and @deprecated members
	if (Node.isInterfaceDeclaration(node)) {
		const commentsToRemove: { remove(): void }[] = [];
		const walkDeclaration = (
			node: InterfaceDeclaration | TypeLiteralNode,
		) => {
			for (const member of node.getMembers()) {
				if (
					member
						.getJsDocs()
						.some((doc) =>
							/@(deprecated|internal)/.test(doc.getInnerText())
						)
				) {
					commentsToRemove.push(member);
				}
				if (Node.isInterfaceDeclaration(member)) {
					walkDeclaration(member);
				} else if (Node.isPropertySignature(member)) {
					const typeNode = member.getTypeNode();
					if (Node.isTypeLiteral(typeNode)) {
						walkDeclaration(typeNode);
					}
				}
			}
		};
		walkDeclaration(node);
		for (let i = commentsToRemove.length - 1; i >= 0; i--) {
			commentsToRemove[i].remove();
		}
	}

	// Remove exports and declare keywords
	if (Node.isModifierable(node)) {
		node = node.toggleModifier("declare", false);
		// @ts-expect-error
		node = node.toggleModifier("export", false);
	}

	let ret: string;
	if (Node.isClassDeclaration(node)) {
		// Class declarations contain the entire source, we are only interested in the properties
		ret = printInterfaceDeclarationStructure(node.extractInterface());
	} else {
		// Comments must be removed last (if that is desired)
		node = stripComments(node, options);
		// Using getText instead of print avoids reformatting the node
		ret = node.getText();
	}

	// Format so we get the original formatting back
	ret = formatWithDprint("index.ts", ret).trim();
	return ret;
}

interface ImportRange {
	index: number;
	end: number;
	module: string;
	symbol: string;
	import: string;
	options: {
		comments?: boolean;
		jsdoc?: boolean;
	};
}

const importRegex =
	/(?<import><!-- #import (?<symbol>.*?) from "(?<module>.*?)"(?: with (?<options>[\w\-, ]*?))? -->)(?:[\s\r\n]*(^`{3,4})ts[\r\n]*(?<source>(.|\n)*?)\5)?/gm;

export function findImportRanges(docFile: string): ImportRange[] {
	const matches = [...docFile.matchAll(importRegex)];
	return matches.map((match) => ({
		index: match.index,
		end: match.index + match[0].length,
		module: match.groups!.module,
		symbol: match.groups!.symbol,
		import: match.groups!.import,
		options: {
			comments: !!match.groups!.options?.includes("comments"),
			jsdoc: !match.groups!.options?.includes("no-jsdoc"),
		},
	}));
}

export async function processDocFile(
	program: Project,
	docFile: string,
): Promise<boolean> {
	console.log(`processing ${docFile}...`);
	let fileContent = await fsp.readFile(docFile, "utf8");
	const ranges = findImportRanges(fileContent);
	let hasErrors = false;
	// Replace from back to start so we can reuse the indizes
	for (let i = ranges.length - 1; i >= 0; i--) {
		const range = ranges[i];
		console.log(`  processing import ${range.symbol} from ${range.module}`);
		const sourceNode = findSourceNode(
			program,
			`packages/${range.module.replace(/^@zwave-js\//, "")}/src/index.ts`,
			range.symbol,
		);
		if (!sourceNode) {
			console.error(
				c.red(
					`${docFile}: Cannot find symbol ${range.symbol} in module ${range.module}!`,
				),
			);
			hasErrors = true;
		} else {
			const source = getTransformedSource(sourceNode, range.options);
			fileContent = `${fileContent.slice(0, range.index)}${range.import}

\`\`\`ts
${source}
\`\`\`${fileContent.slice(range.end)}`;
		}
	}
	console.log(`formatting ${docFile}...`);
	fileContent = fileContent.replaceAll("\r\n", "\n");
	fileContent = formatWithDprint(docFile, fileContent);
	if (!hasErrors) {
		await fsp.writeFile(docFile, fileContent, "utf8");
	}
	return hasErrors;
}

/** Processes all imports, returns true if there was an error */
async function processImports(piscina: Piscina): Promise<boolean> {
	const files = await enumFilesRecursive(
		fs,
		path.join(projectRoot, "docs"),
		(f) =>
			!f.includes("/CCs/") && !f.includes("\\CCs\\") && f.endsWith(".md"),
	);

	const tasks = files.map((f) => piscina.run(f, { name: "processImport" }));

	const hasErrors = (await Promise.all(tasks)).some((result) => result);
	return hasErrors;
}

async function main(): Promise<void> {
	const piscina = new Piscina({
		filename: path.join(__dirname, "generateImports.ts"),
		maxThreads: 4,
	});

	const hasErrors = await processImports(piscina);

	if (hasErrors) {
		process.exit(1);
	}
}

// To be able to use this as a worker thread, export the available methods
let _program: Project | undefined;
function getProgram(): Project {
	if (!_program) {
		_program = new Project({ tsConfigFilePath });
	}
	return _program;
}

export function processImport(filename: string): Promise<boolean> {
	return processDocFile(getProgram(), filename);
}

// If this is NOT run as a worker thread, execute the main function
if (isMainThread) {
	if (esMain(import.meta)) {
		void main();
	}
}
