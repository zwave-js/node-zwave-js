import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

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

		const emptyFromImpls = file.getDescendantsOfKind(
			SyntaxKind.MethodDeclaration,
		)
			.filter((m) => m.isStatic() && m.getName() === "from")
			.filter((m) => {
				const params = m.getParameters();
				if (params.length !== 2) return false;
				if (
					params[0].getDescendantsOfKind(SyntaxKind.TypeReference)[0]
						?.getText() !== "CCRaw"
				) return false;
				if (
					params[1].getDescendantsOfKind(SyntaxKind.TypeReference)[0]
						?.getText() !== "CCParsingContext"
				) {
					return false;
				}
				return true;
			})
			.filter((m) => {
				const body = m.getBody()?.asKind(SyntaxKind.Block);
				if (!body) return false;
				const firstStmt = body.getStatements()[0];
				if (!firstStmt) return false;
				if (
					firstStmt.isKind(SyntaxKind.ThrowStatement)
					&& firstStmt.getText().includes("ZWaveError")
				) {
					return true;
				}
				return false;
			});

		if (emptyFromImpls.length === 0) continue;

		for (const impl of emptyFromImpls) {
			for (const param of impl.getParameters()) {
				param.rename("_" + param.getName());
			}
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
