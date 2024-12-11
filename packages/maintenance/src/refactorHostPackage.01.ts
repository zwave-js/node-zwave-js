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
		const getSupportedCCVersionImport = file.getImportDeclarations().map(
			(decl) =>
				decl.getNamedImports().find((imp) =>
					imp.getName() === "GetSupportedCCVersion"
				),
		).find((imp) => !!imp);
		const getSafeCCVersionImport = file.getImportDeclarations().map(
			(decl) =>
				decl.getNamedImports().find((imp) =>
					imp.getName() === "GetSafeCCVersion"
				),
		).find((imp) => !!imp);

		if (!getSupportedCCVersionImport && !getSafeCCVersionImport) {
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

		if (getSupportedCCVersionImport) {
			targetImport.addNamedImport({
				name: "GetSupportedCCVersion",
				isTypeOnly: true,
			});

			const parent = getSupportedCCVersionImport.getFirstAncestorByKind(
				SyntaxKind.ImportDeclaration,
			);
			getSupportedCCVersionImport.remove();

			if (parent?.getNamedImports().length === 0) {
				parent.remove();
			}
		}
		if (getSafeCCVersionImport) {
			targetImport.addNamedImport({
				name: "GetSafeCCVersion",
				isTypeOnly: true,
			});

			const parent = getSafeCCVersionImport.getFirstAncestorByKind(
				SyntaxKind.ImportDeclaration,
			);
			getSafeCCVersionImport.remove();

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
