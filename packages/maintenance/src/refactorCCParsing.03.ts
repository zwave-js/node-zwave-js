import fs from "node:fs/promises";
import { type IntersectionTypeNode, Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/cc/tsconfig.json",
	});
	// project.addSourceFilesAtPaths("packages/cc/src/cc/**/*CC.ts");

	const sourceFiles = project.getSourceFiles().filter((file) =>
		file.getBaseNameWithoutExtension().endsWith("CC")
	);
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		// Add required imports
		const hasWithAddressImport = file.getImportDeclarations().some(
			(decl) =>
				decl.getNamedImports().some((imp) =>
					imp.getName() === "WithAddress"
				),
		);
		if (!hasWithAddressImport) {
			const existing = file.getImportDeclaration((decl) =>
				decl.getModuleSpecifierValue().startsWith("@zwave-js/core")
			);
			if (!existing) {
				file.addImportDeclaration({
					moduleSpecifier: "@zwave-js/core",
					namedImports: [{
						name: "WithAddress",
						isTypeOnly: true,
					}],
				});
			} else {
				existing.addNamedImport({
					name: "WithAddress",
					isTypeOnly: true,
				});
			}
		}

		// Remove old imports
		const oldImports = file.getImportDeclarations().map((decl) =>
			decl.getNamedImports().find(
				(imp) => imp.getName() === "CCCommandOptions",
			)
		).filter((i) => i != undefined);
		for (const imp of oldImports) {
			imp.remove();
		}

		const oldTypes = file.getDescendantsOfKind(SyntaxKind.TypeReference)
			.filter((ref) => ref.getText() === "CCCommandOptions")
			.map((ref) => ref.getParentIfKind(SyntaxKind.IntersectionType))
			.filter((typ): typ is IntersectionTypeNode =>
				typ != undefined
				&& !!typ.getParent().isKind(SyntaxKind.Parameter)
				&& !!typ.getParent().getParent()?.isKind(SyntaxKind.Constructor)
			);
		for (const type of oldTypes) {
			const otherType = type.getText().replace("& CCCommandOptions", "")
				.replace("CCCommandOptions & ", "");
			type.replaceWithText(`WithAddress<${otherType}>`);
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
