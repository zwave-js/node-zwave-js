import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});

	const sourceFiles = project.getSourceFiles().filter((file) =>
		file.getFilePath().includes("lib/serialapi/")
	);
	for (const file of sourceFiles) {
		const emptyFromImpls = file.getDescendantsOfKind(
			SyntaxKind.MethodDeclaration,
		)
			.filter((m) => m.isStatic() && m.getName() === "from")
			.filter((m) => {
				const params = m.getParameters();
				if (params.length !== 2) return false;
				if (
					params[0].getDescendantsOfKind(SyntaxKind.TypeReference)[0]
						?.getText() !== "MessageRaw"
				) return false;
				if (
					params[1].getDescendantsOfKind(SyntaxKind.TypeReference)[0]
						?.getText() !== "MessageParsingContext"
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
				if (!param.getName().startsWith("_")) {
					param.rename("_" + param.getName());
				}
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
