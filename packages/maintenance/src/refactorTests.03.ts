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
		// Find integration tests
		const testBodies = file.getDescendantsOfKind(
			SyntaxKind.PropertyAssignment,
		)
			.filter((c) => c.getName() === "testBody")
			.map((t) => t.getInitializerIfKind(SyntaxKind.ArrowFunction))
			.filter((f) => f != undefined);

		const testBodies2 = file.getDescendantsOfKind(
			SyntaxKind.MethodDeclaration,
		).filter((m) => m.getName() === "testBody");

		const contextUsages = [...testBodies, ...testBodies2].map((t) =>
			t.getParameters()[0]
		)
			.filter((p) => p != undefined)
			.flatMap((p) => p.findReferencesAsNodes());

		if (contextUsages.length === 0) continue;

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
				if (methodName === "is") {
					replaceAssertion_is(ident, propAccess, callExpr);
				} else if (methodName === "not") {
					replaceAssertion_not(ident, propAccess, callExpr);
				} else if (methodName === "true" || methodName === "false") {
					replaceAssertion_staticValue(
						ident,
						propAccess,
						callExpr,
						methodName,
					);
				} else if (methodName === "truthy") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toBeTruthy",
					);
				} else if (methodName === "falsy") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toBeFalsy",
					);
				} else if (methodName === "deepEqual") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toStrictEqual",
					);
				} else if (methodName === "notDeepEqual") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"not.toStrictEqual",
					);
				} else if (methodName === "like") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toMatchObject",
					);
				} else if (methodName === "throws") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toThrow",
					);
				} else if (methodName === "notThrows") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"not.toThrow",
					);
				} else if (methodName === "throwsAsync") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"rejects.toThrow",
					);
				} else if (methodName === "teardown") {
					propAccess.replaceWithText(
						`${ident.getText()}.onTestFinished`,
					);
				} else if (methodName === "timeout") {
					// Translate timeout call to an additional argument of the test method
					replaceTestTimeout(ident, propAccess, callExpr);
				}
			}
		}

		await file.save();
	}
}

function replaceAssertion_is(
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
				`${callExpr.getText()}.toBeUndefined()`,
			);
			break;
		case "null":
			callExpr.replaceWithText(
				`${callExpr.getText()}.toBeNull()`,
			);
			break;
		default:
			callExpr.replaceWithText(
				`${callExpr.getText()}.toBe(${arg1 ?? ""})`,
			);
			break;
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

function replaceAssertion_staticValue(
	ident: Identifier,
	propAccess: PropertyAccessExpression,
	callExpr: CallExpression,
	value: string,
) {
	propAccess.replaceWithText(`${ident.getText()}.expect`);
	callExpr.replaceWithText(
		`${callExpr.getText()}.toBe(${value})`,
	);
}

function replaceAssertion_staticAssertion(
	ident: Identifier,
	propAccess: PropertyAccessExpression,
	callExpr: CallExpression,
	assertion: string,
) {
	propAccess.replaceWithText(`${ident.getText()}.expect`);
	const arg1 = callExpr.getArguments()[1]?.getText();
	if (arg1) callExpr.removeArgument(1);
	callExpr.replaceWithText(
		`${callExpr.getText()}.${assertion}(${arg1 ?? ""})`,
	);
}

function replaceTestTimeout(
	ident: Identifier,
	propAccess: PropertyAccessExpression,
	callExpr: CallExpression,
) {
	const timeout = callExpr.getArguments()[0]?.getText();
	if (!timeout) return;

	const stmt = callExpr.getParentIfKind(SyntaxKind.ExpressionStatement);
	if (!stmt) return;

	const testMethodCall = stmt.getFirstAncestorByKind(
		SyntaxKind.CallExpression,
	);
	if (!testMethodCall?.getExpression().getText().startsWith("test.")) return;

	testMethodCall.addArgument(timeout);
	stmt.remove();
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
