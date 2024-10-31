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

		const relativeExports = file.getExportDeclarations().filter((exp) => {
			return exp.getModuleSpecifierValue()?.startsWith(".")
				&& !exp.getModuleSpecifierValue()?.endsWith(".js");
		});
		if (relativeExports.length === 0) continue;

		for (const exp of relativeExports) {
			const oldPath = exp.getModuleSpecifierValue();
			const newPath = oldPath + ".js";
			exp.setModuleSpecifier(newPath);
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
