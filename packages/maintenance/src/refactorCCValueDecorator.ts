import fs from "node:fs/promises";
import {
	type DecoratorStructure,
	type OptionalKind,
	Project,
	SyntaxKind,
} from "ts-morph";

async function main() {
	const project = new Project({
		tsConfigFilePath: "packages/cc/tsconfig.json",
	});

	const sourceFiles = project.getSourceFiles();
	for (const file of sourceFiles) {
		const ccValueImport = file.getImportDeclarations().find((i) =>
			i.getModuleSpecifierValue().endsWith("CommandClassDecorators.js")
		)?.getNamedImports().find((n) => n.getName() === "ccValue");
		if (!ccValueImport) continue;

		ccValueImport.replaceWithText("ccValueProperty");

		const classesWithDecoratedProperties = file.getDescendantsOfKind(
			SyntaxKind.ClassDeclaration,
		)
			.map((c) => {
				const decoratedProperties = c.getDescendantsOfKind(
					SyntaxKind.PropertyDeclaration,
				)
					.map((p) => {
						const decorator = p.getDecorator("ccValue");
						if (!decorator) return;

						return [
							p,
							decorator,
						] as const;
					})
					.filter((p) => p != undefined);

				if (decoratedProperties.length === 0) return;

				return [c, decoratedProperties] as const;
			})
			.filter((c) => c != undefined);

		for (const [cls, propAndDec] of classesWithDecoratedProperties) {
			for (const [prop, dec] of propAndDec) {
				if (dec.getArguments().length === 2) {
					// The second argument can have unnecessary stuff
					const secondArg = dec.getArguments()[1].asKind(
						SyntaxKind.ArrowFunction,
					);
					if (!secondArg) continue;
					const param = secondArg.getParameters()[0]?.asKind(
						SyntaxKind.Parameter,
					);
					if (param) param.removeType();
					const bodyText = secondArg.getBody().getText();
					if (bodyText.includes("as const")) {
						secondArg.getBody().replaceWithText(
							bodyText.replace("as const", ""),
						);
					}
				}

				const decArgs = dec.getArguments().map((a) => a.getText());
				const newDecorator: OptionalKind<DecoratorStructure> = {
					name: "ccValueProperty",
					arguments: [
						`"${prop.getName()}"`,
						...decArgs,
					],
				};
				cls.addDecorator(newDecorator);
				dec.remove();
			}
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
  new text: ${e.filePath}.new`);

	process.exit(1);
});
