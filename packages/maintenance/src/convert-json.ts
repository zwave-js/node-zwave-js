/*
 * Script to convert JSON config files from the old format to the new one.
 * Execute with `yarn ts packages/maintenance/src/convert-json.ts`
 */

import { enumFilesRecursive } from "@zwave-js/shared";
import fs from "fs-extra";
import path from "path";
import { Project, ts } from "ts-morph";
import { formatWithPrettier } from "./prettier";

async function main() {
	const project = new Project();

	const devicesDir = path.join(__dirname, "../../config/config/devices");

	const configFiles = await enumFilesRecursive(
		devicesDir,
		(file) =>
			file.endsWith(".json") &&
			!file.endsWith("index.json") &&
			!file.includes("/templates/") &&
			!file.includes("\\templates\\"),
	);

	for (const filename of configFiles) {
		const content = await fs.readFile(filename, "utf8");
		const sourceFile = project.createSourceFile(filename, content, {
			overwrite: true,
			scriptKind: ts.ScriptKind.JSON,
		});

		const root = sourceFile
			.getChildrenOfKind(ts.SyntaxKind.SyntaxList)[0]
			.getChildrenOfKind(ts.SyntaxKind.ExpressionStatement)[0]
			.getChildrenOfKind(ts.SyntaxKind.ObjectLiteralExpression)[0];

		let didChange = false;

		root.transform((traversal) => {
			const node = traversal.currentNode;

			// Only look for the paramInformation property
			if (node === root.compilerNode) return traversal.visitChildren();
			if (!ts.isPropertyAssignment(node)) return node;
			if (node.name.getText() !== `"paramInformation"`) return node;
			// Make sure it hasn't already been transformed to an array
			if (!ts.isObjectLiteralExpression(node.initializer)) return node;

			const children = node.initializer.properties.flatMap((prop) => {
				if (!ts.isPropertyAssignment(prop))
					throw new Error("Can't touch this!");
				// We can have arrays or objects as params
				if (ts.isObjectLiteralExpression(prop.initializer)) {
					// Objects are simple, we just add the param no. there
					return [
						ts.createObjectLiteral([
							ts.createPropertyAssignment(
								`"#"`,
								ts.createStringLiteral(
									prop.name.getText().slice(1, -1),
								),
							),
							...prop.initializer.properties,
						]),
					];
				} else if (ts.isArrayLiteralExpression(prop.initializer)) {
					// Arrays need to be unwrapped
					return prop.initializer.elements.map((item) => {
						if (!ts.isObjectLiteralExpression(item))
							throw new Error("Can't touch this!");

						return ts.createObjectLiteral([
							ts.createPropertyAssignment(
								`"#"`,
								ts.createStringLiteral(
									prop.name.getText().slice(1, -1),
								),
							),
							...item.properties,
						]);
					});
				}
				throw new Error("Can't touch this!");
			});

			didChange = true;
			return ts.updatePropertyAssignment(
				node,
				node.name,
				ts.createArrayLiteral(children),
			);
		});

		if (didChange) {
			let output = sourceFile.getFullText();
			output = formatWithPrettier(filename, output);
			await fs.writeFile(filename, output, "utf8");
		}
	}
}

if (require.main === module) {
	void main();
}
