/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import { red } from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";
import {
	CommentRange,
	ExportedDeclarations,
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

export function stripSingleLineComments(
	node: ExportedDeclarations,
	text: string,
): string {
	return text;
}

export function getTransformedSource(
	node: ExportedDeclarations,
	options: ImportRange["options"],
): string {
	// Remove exports keyword
	if (Node.isModifierableNode(node)) {
		node = node.toggleModifier("export", false);
	}

	if (Node.isTextInsertableNode(node)) {
		// Remove some comments if desired
		const commentRanges: { pos: number; end: number }[] = [];
		const removePredicate = (c: CommentRange) =>
			(!options.comments &&
				c.getKind() === SyntaxKind.SingleLineCommentTrivia) ||
			(!options.jsdoc &&
				c.getKind() === SyntaxKind.MultiLineCommentTrivia);

		if (Node.isEnumDeclaration(node)) {
			for (const member of node.getMembers()) {
				commentRanges.push(
					...member
						.getLeadingCommentRanges()
						.filter(removePredicate)
						.map((c) => ({ pos: c.getPos(), end: c.getEnd() })),
				);
			}
		}
		// Sort in reverse order, so the removals don't influence each other
		commentRanges.sort((a, b) => b.pos - a.pos);
		for (const { pos, end } of commentRanges) {
			node.removeText(pos, end);
		}
	}

	let ret = node.print();
	if (!options.comments) {
		// Strip out leading single-line comments, ts-morph seems to be 2 chars off when we do that
		const commentRegex = /^\/\/.+\r?\n/g;
		ret = ret.replace(commentRegex, "");
	}

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
	let fileContent = await fs.readFile(docFile, "utf8");
	const ranges = findImportRanges(fileContent);
	let hasErrors = false;
	// Replace from back to start so we can reuse the indizes
	for (let i = ranges.length - 1; i >= 0; i--) {
		const range = ranges[i];
		const sourceNode = findSourceNode(
			program,
			`packages/${range.module}/src/index.ts`,
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

if (!module.parent) {
	void main();
}
