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

		const fromImpls = file.getDescendantsOfKind(
			SyntaxKind.MethodDeclaration,
		)
			.filter((m) => m.isStatic() && m.getName() === "from")
			.filter((m) => {
				const returnType = m.getReturnTypeNode()?.getText();
				return returnType?.includes("CC") && !returnType.endsWith("CC");
			});

		const returnNewStmts = fromImpls
			.flatMap((m) => m.getDescendantsOfKind(SyntaxKind.ReturnStatement))
			.map((ret) =>
				ret.getExpressionIfKind(SyntaxKind.NewExpression)
					?.getExpressionIfKind(SyntaxKind.Identifier)
			)
			.filter((ident) => ident != undefined)
			.filter((ident) => ident.getText() !== "this");
		if (returnNewStmts.length === 0) continue;

		for (const ident of returnNewStmts) {
			ident.replaceWithText("this");
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
