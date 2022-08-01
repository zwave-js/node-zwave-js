/*
 * Script to convert JSON config files from the old format to the new one.
 * Execute with `yarn ts packages/maintenance/src/convert-json.ts`
 */

import { red as ansiRed } from "ansi-colors";
import fs from "fs-extra";
import path from "path";
import { Project, ts } from "ts-morph";

import tasks from "./convert-json-jasco.json";
import { formatWithPrettier } from "./prettier";

const red = process.env.NO_COLOR
	? (str: string) => str
	: (str: string) => ansiRed(str);

interface Task {
	"current label": string;
	manufacturerId: string;
	productType: string;
	productId: string;
	SKU: number;
	"ZW#": string;
	"new label": string;
	"current brand": string;
	"new brand": string;
	"new description": string;
	filename: string;
	"new filename": string;
	"rename?": string;
}

async function main() {
	const project = new Project();

	const devicesDir = path.join(__dirname, "../../config/config/devices");

	// const configFiles = await enumFilesRecursive(
	// 	devicesDir,
	// 	(file) =>
	// 		file.endsWith(".json") &&
	// 		!file.endsWith("index.json") &&
	// 		!file.includes("/templates/") &&
	// 		!file.includes("\\templates\\"),
	// );

	const processed = new Set<string>();

	for (const task of tasks as Task[]) {
		const filename = task.filename;
		if (processed.has(filename)) {
			console.error();
			console.error(
				red(`Skipping ${filename}, duplicate or already processed`),
			);
			continue;
		}

		if (
			task["rename?"] !== "Rename to New" &&
			task["rename?"] !== "Keep Old"
		) {
			console.error();
			console.error(
				red(`Skipping ${filename}, unknown task ${task["rename?"]}`),
			);
			continue;
		}

		console.log();
		console.log(`Processing ${filename}`);

		const newFileName = task["new filename"];
		const currentLabel = task["current label"];
		const newLabel = task["new label"];
		const currentBrand = task["current brand"];
		const newBrand = task["new brand"];
		const newDescription = task["new description"];

		const filenameFull = path.join(devicesDir, filename);
		if (!fs.pathExistsSync(filenameFull)) {
			console.error();
			console.error(red(`Skipping ${filename}, file does not exist!`));
			continue;
		}

		const content = await fs.readFile(filenameFull, "utf8");
		const sourceFile = project.createSourceFile(filenameFull, content, {
			overwrite: true,
			scriptKind: ts.ScriptKind.JSON,
		});

		const root = sourceFile
			.getChildrenOfKind(ts.SyntaxKind.SyntaxList)[0]
			.getChildrenOfKind(ts.SyntaxKind.ExpressionStatement)[0]
			.getChildrenOfKind(ts.SyntaxKind.ObjectLiteralExpression)[0];

		root.transform((traversal) => {
			const node = traversal.currentNode;

			// Only look for the paramInformation property
			if (node === root.compilerNode) return traversal.visitChildren();
			if (!ts.isPropertyAssignment(node)) return node;
			// Make sure we're looking at a simple string property
			if (!ts.isStringLiteral(node.initializer)) return node;

			switch (node.name.getText()) {
				case `"label"`: {
					const actualLabel = node.initializer.getText().slice(1, -1);
					if (actualLabel !== currentLabel) {
						console.error();
						console.error(
							red(`Skipping ${filename}, label does not match`),
						);
						console.error(
							red(
								`Expected: ${currentLabel}, got: ${actualLabel}`,
							),
						);
						return node;
					}
					return ts.factory.updatePropertyAssignment(
						node,
						node.name,
						ts.factory.createStringLiteral(newLabel, false),
					);
					break;
				}
				case `"manufacturer"`: {
					const actualBrand = node.initializer.getText().slice(1, -1);
					if (actualBrand !== currentBrand) {
						console.error();
						console.error(
							red(
								`Skipping ${filename}, brand/manufacturer does not match`,
							),
						);
						console.error(
							red(
								`Expected: ${currentBrand}, got: ${actualBrand}`,
							),
						);
						return node;
					}
					return ts.factory.updatePropertyAssignment(
						node,
						node.name,
						ts.factory.createStringLiteral(newBrand, false),
					);
					break;
				}
				case `"description"`: {
					return ts.factory.updatePropertyAssignment(
						node,
						node.name,
						ts.factory.createStringLiteral(newDescription, false),
					);
					break;
				}
			}

			return node;
		});

		// 	if (didChange) {
		let output = sourceFile.getFullText();
		output = formatWithPrettier(filenameFull, output);
		await fs.writeFile(filenameFull, output, "utf8");

		// Rename with a temp extension to avoid overwriting files
		if (task["rename?"] === "Rename to New") {
			const newFilenameFull = path.join(devicesDir, newFileName + ".tmp");
			await fs.move(filenameFull, newFilenameFull);
		}
		// 	}

		processed.add(filename);
	}

	// Then remove temp extension
	for (const task of tasks as Task[]) {
		const newFileName = task["new filename"];
		const newFilenameTmpFull = path.join(devicesDir, newFileName + ".tmp");
		const newFilenameFull = path.join(devicesDir, newFileName);
		if (fs.pathExistsSync(newFilenameTmpFull)) {
			await fs.move(newFilenameTmpFull, newFilenameFull);
		}
	}
}

if (require.main === module) {
	void main();
}
