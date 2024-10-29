import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});

	const sourceFiles = project.getSourceFiles().filter((file) =>
		file.getFilePath().includes("/serialapi/")
	);
	for (const file of sourceFiles) {
		const hasBytesImport = file.getImportDeclarations().some((i) =>
			i.getModuleSpecifierValue().startsWith("@zwave-js/shared")
			&& i.getNamedImports().some((n) => n.getName() === "Bytes")
		);

		const usesBytesImport = file.getDescendantsOfKind(SyntaxKind.Identifier)
			.some((i) => i.getText() === "Bytes");

		if (file.getBaseName().includes("DeleteSUCReturnRouteMessages")) {
			debugger;
		}

		if (hasBytesImport || !usesBytesImport) {
			continue;
		}

		const existing = file.getImportDeclaration((decl) =>
			decl.getModuleSpecifierValue().startsWith("@zwave-js/shared")
		);
		if (!existing) {
			file.addImportDeclaration({
				moduleSpecifier: "@zwave-js/shared",
				namedImports: [{
					name: "Bytes",
				}],
			});
		} else {
			existing.addNamedImport({
				name: "Bytes",
			});
		}

		await file.save();
	}
}

void main().catch(async (e) => {
	await fs.writeFile(`${e.filePath}.old`, e.oldText);
	await fs.writeFile(`${e.filePath}.new`, e.newText);
	console.error(`Error refactoring file ${e.filePath}
  old text: ${e.filePath}.old
  new text: ${e.filePath}.new`);

	process.exit(1);
});
