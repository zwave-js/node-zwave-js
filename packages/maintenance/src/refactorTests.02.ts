import fs from "node:fs/promises";
import {
	type CallExpression,
	type Identifier,
	Project,
	type PropertyAccessExpression,
	SyntaxKind,
} from "ts-morph";

async function main() {
	const project = new Project();
	project.addSourceFilesAtPaths("packages/**/*.test.ts");

	const sourceFiles = project.getSourceFiles() /*.filter((f) =>
		f.getFilePath().endsWith("JsonTemplate.test.ts")
	) */;

	for (const file of sourceFiles) {
		// Find tests
		const tests = file.getDescendantsOfKind(SyntaxKind.CallExpression)
			.filter((c) =>
				c.getExpressionIfKind(SyntaxKind.Identifier)?.getText()
					=== "test"
				|| c.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
						?.getExpressionIfKind(SyntaxKind.Identifier)?.getText()
					=== "test"
			).filter((f) =>
				f.getArguments().length >= 2
				&& f.getArguments()[1].asKind(SyntaxKind.ArrowFunction)
						?.getParameters().length === 1
			);

		const testsAndContexts = tests.map((t) => {
			const context =
				t.getArguments()[1].asKind(SyntaxKind.ArrowFunction)!
					.getParameters()[0];
			return [t, context] as const;
		});
		const testsAndContextUsages = testsAndContexts.map((
			[t, c],
		) => [t, c.findReferencesAsNodes()]);

		const contextUsages = testsAndContextUsages.flatMap(([, usages]) =>
			usages
		);

		if (contextUsages.length === 0) continue;

		let didSomething = false;

		for (const t of contextUsages) {
			// Do simple replacements first
			const ident = t.asKind(SyntaxKind.Identifier);
			const propAccess = ident?.getParentIfKind(
				SyntaxKind.PropertyAccessExpression,
			);
			const callExpr = propAccess?.getParentIfKind(
				SyntaxKind.CallExpression,
			);

			if (!!ident && !!propAccess && !!callExpr) {
				const methodName = propAccess.getName();
				if (methodName === "not") {
					replaceAssertion_not(ident, propAccess, callExpr);
					didSomething = true;
				}
			}
		}

		if (didSomething) await file.save();
	}
}

function replaceAssertion_not(
	ident: Identifier,
	propAccess: PropertyAccessExpression,
	callExpr: CallExpression,
) {
	// Check the 2nd argument for more specific assertions
	const arg1 = callExpr.getArguments()[1]?.getText();
	propAccess.replaceWithText(`${ident.getText()}.expect`);
	if (arg1) callExpr.removeArgument(1);
	switch (arg1) {
		case "undefined":
			callExpr.replaceWithText(
				`${callExpr.getText()}.toBeDefined()`,
			);
			break;
		case "null":
			callExpr.replaceWithText(
				`${callExpr.getText()}.not.toBeNull()`,
			);
			break;
		default:
			callExpr.replaceWithText(
				`${callExpr.getText()}.not.toBe(${arg1 ?? ""})`,
			);
			break;
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
