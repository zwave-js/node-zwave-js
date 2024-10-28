import fs from "node:fs/promises";
import { Project, SyntaxKind } from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/zwave-js/tsconfig.json",
	});

	const sourceFiles = project.getSourceFiles();
	for (const file of sourceFiles) {
		const waitImports = file.getImportDeclarations().filter((i) =>
			i.getModuleSpecifierValue() === "alcalzone-shared/async"
		).map((i) => {
			const named = i.getNamedImports().find((n) =>
				n.getName() === "wait"
			);
			if (!named) return;
			return [i, named] as const;
		}).filter((i) => i != undefined);

		for (const [decl, named] of waitImports) {
			decl.setModuleSpecifier("node:timers/promises");
			named.replaceWithText("setTimeout as wait");
		}

		const waitCalls = file.getDescendantsOfKind(SyntaxKind.CallExpression)
			.filter((c) =>
				c.getExpressionIfKind(SyntaxKind.Identifier)?.getText()
					=== "wait"
			)
			.map((c) => {
				const args = c.getArguments();
				if (args.length < 1 || args.length > 2) return;
				const timeout = args[0];
				const unref = args[1]?.getText() as string | undefined;
				const then = c.getParentIfKind(
					SyntaxKind.PropertyAccessExpression,
				);
				const thenCall = then?.getName() === "then"
					&& then.getParentIfKind(SyntaxKind.CallExpression);
				const thenArg = thenCall && thenCall.getArguments()[0];
				const thenResult = thenArg
					&& thenArg.asKind(SyntaxKind.ArrowFunction)?.getBodyText();
				const nodeToReplace = thenResult ? thenCall : c;

				return [
					nodeToReplace,
					timeout.getText(),
					thenResult || "undefined",
					unref,
				] as const;
			})
			.filter((c) => c != undefined);

		for (const [node, timeout, thenResult, unref] of waitCalls) {
			const ref = unref === "true"
				? "false"
				: !!unref
				? `!${unref}`
				: "true";
			if (ref === "true") {
				if (thenResult === "undefined") {
					node.replaceWithText(`wait(${timeout})`);
				} else {
					node.replaceWithText(
						`wait(${timeout}, ${thenResult})`,
					);
				}
			} else {
				node.replaceWithText(
					`wait(${timeout}, ${thenResult}, { ref: ${ref} })`,
				);
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
