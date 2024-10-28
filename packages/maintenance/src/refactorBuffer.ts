import fs from "node:fs/promises";
import { Project } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});

	const sourceFiles = project.getSourceFiles() /*.filter((file) =>
		file.getBaseNameWithoutExtension().endsWith("CC")
	)*/;
	for (const file of sourceFiles) {
		const bufferImports = file.getImportDeclarations().filter((i) =>
			i.getModuleSpecifierValue() === "@zwave-js/shared"
		).map((i) => {
			return i.getNamedImports().find((n) => n.getName() === "Buffer");
		}).filter((i) => i != undefined);

		if (!bufferImports.length) continue;

		bufferImports.forEach((i) => {
			i.renameAlias("Bytes");
			i.setName("Bytes");
			i.removeAliasWithRename();
		});

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
