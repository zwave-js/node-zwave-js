import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project();
	project.addSourceFilesAtPaths("packages/**/*.test.ts");

	const sourceFiles = project.getSourceFiles() /*.filter((f) =>
		f.getFilePath().endsWith("JsonTemplate.test.ts")
	) */;

	for (const file of sourceFiles) {
		// Find calls to `CommandClass.parse`
		const ccParse = file.getDescendantsOfKind(
			SyntaxKind.PropertyAccessExpression,
		)
			.filter((p) => p.getText() === "CommandClass.parse")
			.map((p) => {
				const callExpr = p.getParentIfKind(SyntaxKind.CallExpression);
				if (!callExpr) return;
				const parentFn = callExpr.getFirstAncestorByKind(
					SyntaxKind.ArrowFunction,
				);
				if (!parentFn) return;
				return [parentFn, callExpr, p] as const;
			})
			.filter((p) => p != undefined);

		if (ccParse.length === 0) continue;

		for (const [parentFn, callExpr, propAccess] of ccParse) {
			parentFn.setIsAsync(true);
			propAccess.replaceWithText("CommandClass.parseAsync");
			callExpr.replaceWithText(`await ${callExpr.getText()}`);
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
  new text: ${e.filePath}.new
  
Reason: ${e.message}`);

	process.exit(1);
});
