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

	const setupReplacements = {
		"test.before": "beforeAll",
		"test.beforeEach": "beforeEach",
		"test.after": "afterAll",
		"test.afterEach": "afterEach",
		"test.afterEach.always": "afterEach",
	};
	const testReplacements = {
		"test.serial": "test.sequential",
		"test.failing": "test.fails",
	};

	for (const file of sourceFiles) {
		const avaImport = file.getImportDeclaration((decl) =>
			decl.getModuleSpecifierValue() === "ava"
		);
		if (!avaImport) continue;

		// debugger;

		// Find setup and teardown
		const setups = file.getDescendantsOfKind(SyntaxKind.CallExpression)
			.map((c) => {
				const fn = c.getExpressionIfKind(
					SyntaxKind.PropertyAccessExpression,
				);
				const fnName = fn?.getText();
				if (
					!fn
					|| !fnName?.startsWith("test.")
					|| !(fnName in setupReplacements)
				) return;
				return [
					fn,
					(setupReplacements as any)[fnName] as string,
				] as const;
			}).filter((f) => f != undefined);

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

		const testMethods = tests.map((t) =>
			t.getExpressionIfKind(SyntaxKind.PropertyAccessExpression)
		)
			.filter((p) => p != undefined)
			.map((prop) => {
				const replacement = (testReplacements as any)[prop.getText()] as
					| string
					| undefined;
				if (!replacement) return;
				return [prop, replacement] as const;
			}).filter((f) => f != undefined);

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

		if (
			testMethods.length === 0
			&& contextUsages.length === 0
			&& setups.length === 0
		) continue;

		for (const [propAccess, newName] of testMethods) {
			propAccess.replaceWithText(newName);
		}

		const additionalImports = new Set<string>();
		for (const [propAccess, newName] of setups) {
			additionalImports.add(newName);
			propAccess.replaceWithText(newName);
		}

		const allImports = ["test", ...additionalImports].join(", ");
		avaImport.replaceWithText(`import { ${allImports} } from "vitest";`);

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
				} else if (methodName === "like") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"toMatchObject",
					);
				} else if (methodName === "notThrows") {
					replaceAssertion_staticAssertion(
						ident,
						propAccess,
						callExpr,
						"not.toThrow",
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
