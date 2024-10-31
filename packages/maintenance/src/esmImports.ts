import fs from "node:fs/promises";
import { Project } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});
	// project.addSourceFilesAtPaths("packages/cc/src/cc/**/*CC.ts");

	const sourceFiles = project.getSourceFiles();
	for (const file of sourceFiles) {
		// const filePath = path.relative(process.cwd(), file.getFilePath());

		const relativeImports = file.getImportDeclarations().filter((imp) => {
			return imp.getModuleSpecifierValue().startsWith(".")
				&& !imp.getModuleSpecifierValue().endsWith(".js");
		});
		if (relativeImports.length === 0) continue;

		for (const imp of relativeImports) {
			const oldPath = imp.getModuleSpecifierValue();
			const newPath = oldPath + ".js";
			imp.setModuleSpecifier(newPath);
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
