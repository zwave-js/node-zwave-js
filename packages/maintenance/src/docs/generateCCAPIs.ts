/*!
 * This method returns the original source code for an interface or type so it can be put into documentation
 */

import { CommandClasses, getCCName } from "@zwave-js/core";
import { num2hex } from "@zwave-js/shared";
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
	type JSDocTagStructure,
	type MethodDeclaration,
	Node,
	type OptionalKind,
	Project,
	type PropertySignatureStructure,
	type SourceFile,
	SyntaxKind,
	type Type,
	TypeFormatFlags,
	type TypeLiteralNode,
	type ts,
} from "ts-morph";
import { formatWithDprint } from "../dprint.js";
import {
	getCommandClassFromClassDeclaration,
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

export function stripComments(
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

function stripQuotes(str: string): string {
	return str.replaceAll(/^['"]|['"]$/g, "");
}

function expectLiteralString(strType: string, context: string): void {
	if (strType === "string") {
		console.warn(
			c.yellow(
				`WARNING: Received type "string" where a string literal was expected.
		Make sure to define this string or the entire object using "as const".
		Context: ${context}`,
			),
		);
	}
}

function expectLiteralNumber(numType: string, context: string): void {
	if (numType === "number") {
		console.warn(
			c.yellow(
				`WARNING: Received type "number" where a number literal was expected.
Make sure to define this number or the entire object using "as const".
Context: ${context}`,
			),
		);
	}
}

const docsDir = path.join(projectRoot, "docs");
const ccDocsDir = path.join(docsDir, "api/CCs");

function fixPrinterErrors(text: string): string {
	return (
		text
			// The text includes one too many tabs at the start of each line
			.replaceAll(/^\t(\t*)/gm, "$1")
			// TS 4.2+ has some weird printing bug for aliases: https://github.com/microsoft/TypeScript/issues/43031
			.replaceAll(
				/(\w+) \| \("unknown" & { __brand: \1; }\)/g,
				"Maybe<$1>",
			)
	);
}

function printMethodDeclaration(method: MethodDeclaration): string {
	method = method.toggleModifier("public", false);
	method.getDecorators().forEach((d) => d.remove());
	const start = method.getStart();
	const end = method.getBody()!.getStart();
	let ret = method
		.getText()
		.slice(0, end - start)
		.trim();
	if (!method.getReturnTypeNode()) {
		ret += ": " + method.getSignature().getReturnType().getText(method);
	}
	ret += ";";
	return fixPrinterErrors(ret);
}

function printOverload(method: MethodDeclaration): string {
	method = method.toggleModifier("public", false);
	return fixPrinterErrors(method.getText());
}

async function processCCDocFile(
	file: SourceFile,
	dtsFile: SourceFile,
): Promise<{ generatedIndex: string; generatedSidebar: any } | undefined> {
	const APIClass = file
		.getClasses()
		.find((c) => c.getName()?.endsWith("CCAPI"));
	if (!APIClass) return;

	const ccId = getCommandClassFromClassDeclaration(
		file.compilerNode,
		APIClass.compilerNode,
	);
	if (ccId == undefined) return;
	const ccName = getCCName(ccId);
	console.log(`generating documentation for ${ccName} CC...`);

	const filename = APIClass.getName()!.replace("CCAPI", "") + ".md";
	let text = `# ${ccName} CC

?> CommandClass ID: \`${num2hex((CommandClasses as any)[ccName])}\`
`;
	const generatedIndex = `\n- [${ccName} CC](api/CCs/${filename}) · \`${
		num2hex(
			(CommandClasses as any)[ccName],
		)
	}\``;
	const generatedSidebar = `\n\t- [${ccName} CC](api/CCs/${filename})`;

	// Enumerate all useful public methods
	const ignoredMethods: string[] = [
		"supportsCommand",
		"isSetValueOptimistic",
	];
	const methods = APIClass.getInstanceMethods()
		.filter((m) => m.hasModifier(SyntaxKind.PublicKeyword))
		.filter((m) => !ignoredMethods.includes(m.getName()));

	if (methods.length) {
		text += `## ${ccName} CC methods\n\n`;
	}

	for (const method of methods) {
		const signatures = method.getOverloads();

		text += `### \`${method.getName()}\`
\`\`\`ts
${
			signatures.length > 0
				? signatures.map(printOverload).join("\n\n")
				: printMethodDeclaration(method)
		}
\`\`\`

`;
		const doc = method.getStructure().docs?.[0];
		if (typeof doc === "string") {
			text += doc + "\n\n";
		} else if (doc != undefined) {
			if (typeof doc.description === "string") {
				let description = doc.description.trim();
				if (!description.endsWith(".")) {
					description += ".";
				}
				text += description + "\n\n";
			}
			if (doc.tags) {
				const paramTags = doc.tags
					.filter(
						(
							t,
						): t is OptionalKind<JSDocTagStructure> & {
							text: string;
						} => t.tagName === "param"
							&& typeof t.text === "string",
					)
					.map((t) => {
						const firstSpace = t.text.indexOf(" ");
						if (firstSpace === -1) return undefined;
						return [
							t.text.slice(0, firstSpace),
							t.text.slice(firstSpace + 1),
						] as const;
					})
					.filter((t) => !!t);

				if (paramTags.length > 0) {
					text += "**Parameters:**  \n\n";
					text += paramTags
						.map(
							([param, description]) =>
								`* \`${param}\`: ${description.trim()}`,
						)
						.join("\n");
					text += "\n\n";
				}
			}
		}
	}

	// List defined value IDs
	const valueIDsConst = (() => {
		for (const stmt of dtsFile.getVariableStatements()) {
			if (!stmt.hasExportKeyword()) continue;
			for (const decl of stmt.getDeclarations()) {
				if (decl.getName()?.endsWith("CCValues")) {
					return decl;
				}
			}
		}
	})();
	if (valueIDsConst) {
		let hasPrintedHeader = false;

		const type = valueIDsConst.getType();
		const formatValueType = (type: Type<ts.Type>): string => {
			const prefix = "type _ = ";
			let ret = formatWithDprint(
				"type.ts",
				prefix
					+ type.getText(valueIDsConst, TypeFormatFlags.NoTruncation),
			)
				.trim()
				.slice(prefix.length, -1);

			// There is probably an official way to do this, but I can't find it
			ret = ret
				.replaceAll(/\(?typeof CommandClasses\)?/g, "CommandClasses")
				.replaceAll(/^(\s+)readonly /gm, "$1")
				.replaceAll(/;$/gm, ",");

			return ret;
		};

		const sortedProperties = type
			.getProperties()
			.sort((a, b) => a.getName().localeCompare(b.getName()));

		for (const value of sortedProperties) {
			let valueType = value.getTypeAtLocation(valueIDsConst);
			let callSignature = "";

			// Remember the options type before resolving dynamic values
			const optionsType = valueType
				.getPropertyOrThrow("options")
				.getTypeAtLocation(valueIDsConst);

			const getOptions = (prop: string): string =>
				optionsType
					.getPropertyOrThrow(prop)
					.getTypeAtLocation(valueIDsConst)
					.getText(valueIDsConst);

			// Do not document internal CC values
			if (getOptions("internal") === "true") continue;

			// "Unwrap" dynamic value IDs
			if (valueType.getCallSignatures().length === 1) {
				const signature = valueType.getCallSignatures()[0];

				callSignature = `(${
					signature.compilerSignature
						.declaration!.parameters.map((p) => p.getText())
						.join(", ")
				})`;

				// This used to be true. leaving it here in case it becomes true again
				// // The call signature has a single argument
				// // args: [arg1: type1, arg2: type2, ...]
				// callSignature = `(${signature
				// 	.getParameters()[0]
				// 	.getTypeAtLocation(valueIDsConst)
				// 	.getText(valueIDsConst)
				// 	// Remove the [] from the tuple
				// 	.slice(1, -1)})`;

				if (!callSignature.includes(":")) debugger;

				valueType = signature.getReturnType();
			} else if (valueType.getCallSignatures().length > 1) {
				throw new Error(
					"Type of value ID had more than 1 call signature",
				);
			}

			const idType = valueType
				.getPropertyOrThrow("endpoint")
				.getTypeAtLocation(valueIDsConst)
				.getCallSignatures()[0]
				.getReturnType();

			const metaType = valueType
				.getPropertyOrThrow("meta")
				.getTypeAtLocation(valueIDsConst);

			const getMeta = (prop: string): string =>
				metaType
					.getPropertyOrThrow(prop)
					.getTypeAtLocation(valueIDsConst)
					.getText(valueIDsConst);

			const tryGetMeta = (
				prop: string,
				onSuccess: (meta: string) => void,
			): void => {
				const symbol = metaType.getProperty(prop);
				if (symbol) {
					const type = symbol
						.getTypeAtLocation(valueIDsConst)
						.getText(valueIDsConst);
					onSuccess(type);
				}
			};

			if (!hasPrintedHeader) {
				text += `## ${ccName} CC values\n\n`;
				hasPrintedHeader = true;
			}

			text += `### \`${value.getName()}${callSignature}\`

\`\`\`ts
${formatValueType(idType)}
\`\`\`
`;

			tryGetMeta("label", (label) => {
				// If the label is definitely not dynamic, ensure it has a literal type
				if (!callSignature) {
					expectLiteralString(
						label,
						`label of value "${value.getName()}"`,
					);
				} else if (label === "string") {
					label = "_(dynamic)_";
				}
				text += `\n* **label:** ${stripQuotes(label)}`;
			});
			tryGetMeta("description", (description) => {
				// If the description is definitely not dynamic, ensure it has a literal type
				if (!callSignature) {
					expectLiteralString(
						description,
						`description of value "${value.getName()}"`,
					);
				} else if (description === "string") {
					description = "_(dynamic)_";
				}
				text += `\n* **description:** ${stripQuotes(description)}`;
			});

			// TODO: This should be moved to TypeScript somehow
			const minVersion = getOptions("minVersion");
			expectLiteralNumber(
				minVersion,
				`minVersion of value "${value.getName()}"`,
			);

			text += `
* **min. CC version:** ${minVersion}
* **readable:** ${getMeta("readable")}
* **writeable:** ${getMeta("writeable")}
* **stateful:** ${getOptions("stateful")}
* **secret:** ${getOptions("secret")}
`;

			tryGetMeta("type", (meta) => {
				text += `* **value type:** \`${meta}\`\n`;
			});
			tryGetMeta("default", (meta) => {
				text += `* **default value:** ${meta}\n`;
			});
			tryGetMeta("min", (meta) => {
				text += `* **min. value:** ${meta}\n`;
			});
			tryGetMeta("max", (meta) => {
				text += `* **max. value:** ${meta}\n`;
			});
			tryGetMeta("minLength", (meta) => {
				text += `* **min. length:** ${meta}\n`;
			});
			tryGetMeta("maxLength", (meta) => {
				text += `* **max. length:** ${meta}\n`;
			});
		}
	}

	text = text.replaceAll("\r\n", "\n");
	text = formatWithDprint(filename, text);

	await fsp.writeFile(path.join(ccDocsDir, filename), text, "utf8");

	return { generatedIndex, generatedSidebar };
}

/** Generates CC documentation, returns true if there was an error */
async function generateCCDocs(
	program: Project,
	piscina: Piscina,
): Promise<boolean> {
	// Delete old cruft

	// Load the index file before it gets deleted
	const indexFilename = path.join(ccDocsDir, "index.md");
	let indexFileContent = await fsp.readFile(indexFilename, "utf8");
	const indexAutoGenToken = "<!-- AUTO-GENERATE: CC List -->";
	const indexAutoGenStart = indexFileContent.indexOf(indexAutoGenToken);
	if (indexAutoGenStart === -1) {
		console.error(
			c.red(`Marker for auto-generation in CCs/index.md missing!`),
		);
		return false;
	}

	await fsp.rm(ccDocsDir, { recursive: true, force: true });
	await fsp.mkdir(ccDocsDir, { recursive: true });

	// Find CC APIs
	const ccFiles = program.getSourceFiles("packages/cc/src/cc/**/*CC.ts");
	// .filter(
	// 	(s) =>
	// 		s.getFilePath().includes("BasicCC") ||
	// 		s.getFilePath().includes("AssociationCC"),
	// );
	let generatedIndex = "";
	let generatedSidebar = "";

	// Process them in parallel
	const tasks = ccFiles.map((f) =>
		piscina.run(f.getFilePath(), { name: "processCC" })
	);
	const results = await Promise.all(tasks);
	for (const result of results) {
		if (result) {
			generatedIndex += result.generatedIndex;
			generatedSidebar += result.generatedSidebar;
		}
	}

	// Write the generated index file and sidebar
	indexFileContent = indexFileContent.slice(
		0,
		indexAutoGenStart + indexAutoGenToken.length,
	) + generatedIndex;
	indexFileContent = formatWithDprint("index.md", indexFileContent);
	await fsp.writeFile(indexFilename, indexFileContent, "utf8");

	const sidebarInputFilename = path.join(docsDir, "_sidebar.md");
	let sidebarFileContent = await fsp.readFile(sidebarInputFilename, "utf8");
	const sidebarAutoGenToken = "<!-- AUTO-GENERATE: CC Links -->";
	const sidebarAutoGenStart = sidebarFileContent.indexOf(sidebarAutoGenToken);
	if (sidebarAutoGenStart === -1) {
		console.error(
			c.red(`Marker for CC auto-generation in _sidebar.md missing!`),
		);
		return false;
	}
	sidebarFileContent = sidebarFileContent.slice(0, sidebarAutoGenStart)
		+ generatedSidebar
		+ sidebarFileContent.slice(
			sidebarAutoGenStart + sidebarAutoGenToken.length,
		);
	sidebarFileContent = formatWithDprint("_sidebar.md", sidebarFileContent);
	await fsp.writeFile(
		path.join(ccDocsDir, "_sidebar.md"),
		sidebarFileContent,
		"utf8",
	);

	return false;
}

async function main(): Promise<void> {
	const piscina = new Piscina({
		filename: path.join(__dirname, "generateCCAPIs.ts"),
		maxThreads: 4,
	});
	const program = new Project({ tsConfigFilePath });

	// Regenerate all CC documentation files
	const hasErrors = await generateCCDocs(program, piscina);

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

export async function processCC(
	filename: string,
): Promise<{ generatedIndex: string; generatedSidebar: any } | undefined> {
	const program = getProgram();
	const sourceFile = program.getSourceFileOrThrow(filename);
	const dtsFile = program.addSourceFileAtPath(
		filename.replace("/src/", "/build/esm/").replace(
			/(?<!\.d)\.ts$/,
			".d.ts",
		),
	);
	try {
		return await processCCDocFile(sourceFile, dtsFile);
	} catch (e: any) {
		throw new Error(`Error processing CC file: ${filename}\n${e.stack}`);
	}
}

// If this is NOT run as a worker thread, execute the main function
if (isMainThread) {
	if (esMain(import.meta)) {
		void main();
	}
}
