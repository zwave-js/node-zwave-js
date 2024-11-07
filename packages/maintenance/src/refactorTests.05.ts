import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project();
	project.addSourceFilesAtPaths("packages/**/*.test.ts");

	const sourceFiles = project.getSourceFiles() /*.filter((f) =>
		f.getFilePath().endsWith("JsonTemplate.test.ts")
	) */;

	for (const file of sourceFiles) {
		// Find calls to `t.expect`
		const tExpect = file.getDescendantsOfKind(
			SyntaxKind.PropertyAccessExpression,
		)
			.filter((p) => p.getText() === "t.expect");

		// Limit to those with a `.serialize` call
		const withSerialize = tExpect
			.map((p) => {
				const call = p.getParentIfKind(
					SyntaxKind.CallExpression,
				);
				if (!call) return;

				const stmt = call.getFirstAncestorByKind(
					SyntaxKind.ExpressionStatement,
				);
				if (!stmt) return;

				const serialize = call.getDescendantsOfKind(
					SyntaxKind.PropertyAccessExpression,
				).filter((s) => s.getName() === "serialize");
				if (serialize.length === 0) return;

				return [
					stmt,
					call,
					serialize.map((s) => s.getNameNode()),
				] as const;
			}).filter((x) => x != undefined);

		const withParentFn = withSerialize.map(([expr, t, s]) => {
			const parentFn = t.getFirstAncestorByKind(SyntaxKind.ArrowFunction);
			if (!parentFn) return;
			return [parentFn, expr, t, s] as const;
		}).filter((x) => x != undefined);

		if (withParentFn.length === 0) continue;

		for (const [parentFn, expr, tExpect, serialize] of withParentFn) {
			parentFn.setIsAsync(true);
			serialize.forEach((s) => s.replaceWithText("serializeAsync"));
			tExpect.replaceWithText(
				`${tExpect.getText()}.resolves`,
			);
			expr.replaceWithText(`await ${expr.getText()}`);
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
