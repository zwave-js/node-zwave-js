import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const yargsInstance = yargs(hideBin(process.argv));

const args = yargsInstance
	.strict()
	.usage("Import refactor script\n\nUsage: $0 [options]")
	.alias("h", "help")
	.alias("v", "version")
	.wrap(Math.min(100, yargsInstance.terminalWidth()))
	.options({
		import: {
			alias: "i",
			describe: "The import to move",
			type: "string",
			demandOption: true,
		},
		module: {
			alias: "m",
			describe: "The module specifier to move the import to",
			type: "string",
			demandOption: true,
		},
		typeOnly: {
			alias: "t",
			describe: "Whether the import should be type-only",
			type: "boolean",
			default: true,
		},
	})
	.parseSync();

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});
	// project.addSourceFilesAtPaths("packages/cc/src/cc/**/*CC.ts");

	const sourceFiles = project.getSourceFiles() /*.filter((file) =>
		file.getBaseNameWithoutExtension().endsWith("CC")
	)*/;
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		// Move import to the correct statements
		const importToMove = file.getImportDeclarations().map(
			(decl) =>
				decl.getNamedImports().find((imp) =>
					imp.getName() === args.import
				),
		).find((imp) => !!imp);

		if (!importToMove) {
			continue;
		}

		let targetImport = file.getImportDeclaration((decl) =>
			decl.getModuleSpecifierValue().startsWith(args.module)
		);
		if (!targetImport) {
			targetImport = file.addImportDeclaration({
				moduleSpecifier: args.module,
				namedImports: [],
			});
		}

		if (importToMove) {
			targetImport.addNamedImport({
				name: importToMove.getName(),
				isTypeOnly: args.typeOnly,
			});

			const parent = importToMove.getFirstAncestorByKind(
				SyntaxKind.ImportDeclaration,
			);
			importToMove.remove();

			if (parent?.getNamedImports().length === 0) {
				parent.remove();
			}
		}

		await file.save();
	}
}

void main().catch(async (e) => {
	debugger;
	await fs.writeFile(`${e.filePath}.old`, e.oldText);
	await fs.writeFile(`${e.filePath}.new`, e.newText);
	console.error(`Error refactoring file ${e.filePath}
  old text: ${e.filePath}.old
  new text: ${e.filePath}.new`);

	process.exit(1);
});
