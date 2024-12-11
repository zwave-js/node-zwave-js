import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

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

		// Move imports to the correct statements
		const getNodeImport = file.getImportDeclarations().map(
			(decl) =>
				decl.getNamedImports().find((imp) =>
					imp.getName() === "GetNode"
				),
		).find((imp) => !!imp);
		const getAllNodesImport = file.getImportDeclarations().map(
			(decl) =>
				decl.getNamedImports().find((imp) =>
					imp.getName() === "GetAllNodes"
				),
		).find((imp) => !!imp);

		if (!getNodeImport && !getAllNodesImport) {
			continue;
		}

		let targetImport = file.getImportDeclaration((decl) =>
			decl.getModuleSpecifierValue().startsWith("@zwave-js/core")
		);
		if (!targetImport) {
			targetImport = file.addImportDeclaration({
				moduleSpecifier: "@zwave-js/core",
				namedImports: [],
			});
		}

		if (getNodeImport) {
			targetImport.addNamedImport({
				name: getNodeImport.getName(),
				isTypeOnly: true,
			});

			const parent = getNodeImport.getFirstAncestorByKind(
				SyntaxKind.ImportDeclaration,
			);
			getNodeImport.remove();

			if (parent?.getNamedImports().length === 0) {
				parent.remove();
			}
		}
		if (getAllNodesImport) {
			targetImport.addNamedImport({
				name: getAllNodesImport.getName(),
				isTypeOnly: true,
			});

			const parent = getAllNodesImport.getFirstAncestorByKind(
				SyntaxKind.ImportDeclaration,
			);
			getAllNodesImport.remove();

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
