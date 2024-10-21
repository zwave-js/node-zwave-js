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

		const ccImplementations = file.getDescendantsOfKind(
			SyntaxKind.ClassDeclaration,
		).filter((cls) => {
			const name = cls.getName();
			if (!name) return false;
			if (!name.includes("CC")) return false;
			// if (name.endsWith("CC")) return false;
			return true;
		});

		const parse = ccImplementations.map((cls) => {
			const method = cls.getMethod("parse");
			if (!method) return;
			if (!method.isStatic()) return;

			return method;
		}).filter((m) => m != undefined);

		if (!parse.length) continue;

		// Add required imports
		const hasRawImport = file.getImportDeclarations().some(
			(decl) =>
				decl.getNamedImports().some((imp) => imp.getName() === "CCRaw"),
		);
		if (!hasRawImport) {
			const existing = file.getImportDeclaration((decl) =>
				decl.getModuleSpecifierValue().endsWith("/lib/CommandClass")
			);
			if (!existing) {
				file.addImportDeclaration({
					moduleSpecifier: "../lib/CommandClass",
					namedImports: [{
						name: "CCRaw",
						isTypeOnly: true,
					}],
				});
			} else {
				existing.addNamedImport({
					name: "CCRaw",
					isTypeOnly: true,
				});
			}
		}

		const hasCCParsingContextImport = file.getImportDeclarations().some(
			(decl) =>
				decl.getNamedImports().some((imp) =>
					imp.getName() === "CCParsingContext"
				),
		);
		if (!hasCCParsingContextImport) {
			const existing = file.getImportDeclaration((decl) =>
				decl.getModuleSpecifierValue().startsWith("@zwave-js/host")
			);
			if (!existing) {
				file.addImportDeclaration({
					moduleSpecifier: "@zwave-js/host",
					namedImports: [{
						name: "CCParsingContext",
						isTypeOnly: true,
					}],
				});
			} else {
				existing.addNamedImport({
					name: "CCParsingContext",
					isTypeOnly: true,
				});
			}
		}

		for (const impl of parse) {
			// Update the method signature
			impl.rename("from");
			impl.getParameters().forEach((p) => p.remove());
			impl.addParameter({
				name: "raw",
				type: "CCRaw",
			});
			impl.addParameter({
				name: "ctx",
				type: "CCParsingContext",
			});

			// Replace "payload" with "raw.payload"
			const idents = impl.getDescendantsOfKind(SyntaxKind.Identifier)
				.filter((id) => id.getText() === "payload");
			idents.forEach((id) => id.replaceWithText("raw.payload"));

			// Replace "options.context.sourceNodeId" with "ctx.sourceNodeId"
			const exprs = impl.getDescendantsOfKind(
				SyntaxKind.PropertyAccessExpression,
			).filter((expr) =>
				expr.getText() === "options.context.sourceNodeId"
			);
			exprs.forEach((expr) => expr.replaceWithText("ctx.sourceNodeId"));
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
