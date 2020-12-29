/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

// wotan-disable no-useless-assertion
// until fimbullinter/wotan#719 is fixed

import { red } from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";
import {
	CommentRange,
	ExportedDeclarations,
	InterfaceDeclaration,
	Node,
	Project,
	SyntaxKind,
} from "ts-morph";
import {
	formatWithPrettier,
	tsConfigFilePath,
} from "../packages/zwave-js/maintenance/tsTools";
import { enumFilesRecursive } from "./tools";

export function findSourceNode(
	program: Project,
	exportingFile: string,
	identifier: string,
): ExportedDeclarations | undefined {
	// Scan all source files
	const file = program.getSourceFile(exportingFile);
	return file?.getExportedDeclarations().get(identifier)?.[0];
}

export function stripComments(
	node: ExportedDeclarations,
	options: ImportRange["options"],
): ExportedDeclarations {
	if (Node.isTextInsertableNode(node)) {
		// Remove some comments if desired
		const ranges: { pos: number; end: number }[] = [];
		const removePredicate = (c: CommentRange) =>
			(!options.comments &&
				c.getKind() === SyntaxKind.SingleLineCommentTrivia) ||
			(!options.jsdoc &&
				c.getKind() === SyntaxKind.MultiLineCommentTrivia);

		const getCommentRangesForNode = (
			node: Node,
		): { pos: number; end: number }[] => {
			const comments = node.getLeadingCommentRanges();
			const ret = comments.map((c, i) => ({
				pos: c.getPos(),
				end:
					i < comments.length - 1
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

export function getTransformedSource(
	node: ExportedDeclarations,
	options: ImportRange["options"],
): string {
	// Remove exports keyword
	if (Node.isModifierableNode(node)) {
		node = node.toggleModifier("export", false);
	}

	// Remove @internal and @deprecated members
	if (Node.isInterfaceDeclaration(node)) {
		for (const member of node.getMembers()) {
			if (
				member
					.getJsDocs()
					.some((doc) =>
						/@(deprecated|internal)/.test(doc.getInnerText()),
					)
			) {
				member.remove();
			}
		}
	}

	// Comments must be removed last (if that is desired)
	node = stripComments(node, options);

	// Using getText instead of print avoids reformatting the node
	let ret = node.getText();
	// Format with Prettier so we get the original formatting back
	ret = formatWithPrettier("index.ts", ret).trim();
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

const importRegex = /(?<import><!-- #import (?<symbol>.*?) from "(?<module>.*?)"(?: with (?<options>[\w\-, ]*?))? -->)(?:[\s\r\n]*```ts[\r\n]*(?<source>(.|\n)*?)```)?/g;

export function findImportRanges(docFile: string): ImportRange[] {
	const matches = [...docFile.matchAll(importRegex)];
	return matches.map((match) => ({
		index: match.index!,
		// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
		end: match.index! + match[0].length,
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
	let fileContent = await fs.readFile(docFile, "utf8");
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
				red(
					`Cannot find symbol ${range.symbol} in module ${range.module}!`,
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
	fileContent = fileContent.replace(/\r\n/g, "\n");
	fileContent = formatWithPrettier(docFile, fileContent);
	if (!hasErrors) {
		await fs.writeFile(docFile, fileContent, "utf8");
	}
	return hasErrors;
}

async function main(): Promise<void> {
	const program = new Project({ tsConfigFilePath });

	const files = await enumFilesRecursive(
		path.join(__dirname, "../docs"),
		(f) => f.endsWith(".md"),
	);
	let hasErrors = false;
	for (const file of files) {
		hasErrors ||= await processDocFile(program, file);
	}
	if (hasErrors) {
		process.exit(1);
	}
}

if (require.main === module) {
	void main();
}
