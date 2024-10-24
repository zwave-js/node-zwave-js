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
		const fromImplsReturningSelf = file
			.getDescendantsOfKind(SyntaxKind.MethodDeclaration)
			.filter((m) => m.isStatic() && m.getName() === "from")
			.map((m) => {
				const clsName = m
					.getParentIfKind(SyntaxKind.ClassDeclaration)
					?.getName();
				if (clsName === "AssignSUCReturnRouteRequest") debugger;
				if (m.getReturnTypeNode()?.getText() === clsName) {
					return [clsName, m] as const;
				}
			})
			.filter((m) => m != undefined);

		const returnSelfStmts = fromImplsReturningSelf.flatMap(
			([clsName, method]) => {
				if (clsName === "AssignSUCReturnRouteRequest") debugger;

				return method
					.getDescendantsOfKind(SyntaxKind.ReturnStatement)
					.map((ret) =>
						ret.getExpressionIfKind(SyntaxKind.NewExpression)
					)
					.filter((newexp) =>
						newexp?.getExpressionIfKind(SyntaxKind.Identifier)
							?.getText() === clsName
					)
					.filter((n) => n != undefined);
			},
		);
		if (returnSelfStmts.length === 0) continue;

		for (const ret of returnSelfStmts) {
			ret.setExpression("this");
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
