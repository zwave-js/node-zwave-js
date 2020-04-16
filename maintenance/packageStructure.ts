/*!
 * This script generates the package structure for npm publishing and cleans up afterwards.
 * Its aim is to provide a neat import structure for consuming applications, e.g.
 * require("zwave-js/commandclasses") etc.
 */

import * as fs from "fs-extra";
import * as path from "path";

// Find this project's root dir
const projectRoot = path.join(__dirname, "..");
const packageJsonPath = path.join(projectRoot, "package.json");
// Define where the CC index file is located
const buildDir = path.join(projectRoot, "build");
// Remember the files we copied (to delete later)
const copiedFile = path.join(projectRoot, ".copied");
// Define which file extensions need to be in the package
const includeInPackageExtensions = [".js", ".d.ts", ".map"];

export async function preparePackageStructure(): Promise<void> {
	if (await fs.pathExists(copiedFile)) {
		throw new Error(
			"The lockfile for npm pack (.copied) already exists. Execute gulp restorePackageStructure first to roll back!",
		);
	}

	// Move files to root dir
	const filesInBuildDir = (await fs.readdir(buildDir)).filter((file) =>
		file.includes("."),
	);
	await fs.writeJSON(copiedFile, filesInBuildDir);
	for (const file of filesInBuildDir) {
		const sourceFileName = path.join(buildDir, file);
		// Update relative paths
		let fileContents = await fs.readFile(sourceFileName, "utf8");
		fileContents = fileContents
			.replace(/"\.\/lib\//g, '"./build/lib/')
			.replace(/"\.\.\/src\//g, '"./src/');
		const targetFileName = path.join(projectRoot, file);
		await fs.writeFile(targetFileName, fileContents, "utf8");
		await fs.unlink(sourceFileName);
	}
	// Make sure they are present in package.json -> files
	const packageJson = await fs.readJSON(packageJsonPath);
	let addedSomething = false;
	for (const file of filesInBuildDir) {
		if (
			(await fs.stat(file)).isFile() &&
			includeInPackageExtensions.some((ext) => file.endsWith(ext)) &&
			!packageJson.files.includes(file)
		) {
			packageJson.files.push(file);
			addedSomething = true;
		}
	}
	if (addedSomething) {
		packageJson.files.sort();
		await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
	}
}

export async function restorePackageStructure(): Promise<void> {
	if (!(await fs.pathExists(copiedFile))) {
		throw new Error(
			"The lockfile for npm pack (.copied) does not exist. Cannot roll back!",
		);
	}

	const filesInBuildDir = await fs.readJSON(copiedFile);
	for (const file of filesInBuildDir) {
		const sourceFileName = path.join(projectRoot, file);
		// Update relative paths
		let fileContents = await fs.readFile(sourceFileName, "utf8");
		fileContents = fileContents
			.replace(/"\.\/build\/lib\//g, '"./lib/')
			.replace(/"\.\/src\//g, '"../src/');
		const targetFileName = path.join(buildDir, file);
		await fs.writeFile(targetFileName, fileContents, "utf8");
		await fs.unlink(sourceFileName);
	}
	await fs.unlink(copiedFile);
}
