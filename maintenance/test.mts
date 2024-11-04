// Test runner that automatically chooses which workspace to run tests in

import execa from "execa";
import path from "node:path";
import { readJSON } from "../packages/shared/src/fs";

import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const repoRoot = path.join(__dirname, "..");

const filenames = process.argv
	.slice(2)
	// ignore flags
	.filter((arg) => !arg.startsWith("-"))
	// normalize slashes
	.map((arg) => arg.replaceAll(/[\\\/]/g, path.sep))
	// Normalize the path to be relative to the repo root
	.map((arg) => path.resolve(repoRoot, arg))
	.map((arg) => path.relative(repoRoot, arg))
	// And limit to actual workspace folders
	.filter((arg) => /packages\/[a-z0-9-]+\//i.test(arg));

// Group by workspace folder
const filenamesMap = new Map<string, string[]>();
for (const filename of filenames) {
	const parts = filename.split(path.sep);
	const workspaceFolder = parts.slice(0, 2).join(path.sep);
	const relativeFilename = parts.slice(2).join(path.sep);
	if (!filenamesMap.has(workspaceFolder)) {
		filenamesMap.set(workspaceFolder, []);
	}
	filenamesMap.get(workspaceFolder)!.push(relativeFilename);
}

async function runAll() {
	await execa("yarn", ["test:ts"], {
		cwd: repoRoot,
		stdio: "inherit",
	});
}

async function runFiles() {
	let hasErrors = false;
	for (const [workspaceFolder, filenames] of filenamesMap) {
		console.log(`Running tests in ${workspaceFolder}...`);

		const packageJson = await readJSON(
			path.join(repoRoot, workspaceFolder, "package.json"),
		);
		const workspaceName = packageJson.name;

		try {
			await execa("yarn", [
				"workspace",
				workspaceName,
				"run",
				"test:ts",
				...filenames,
			], {
				cwd: repoRoot,
				stdio: "inherit",
			});
		} catch {
			hasErrors = true;
		}
	}

	if (hasErrors) {
		process.exit(1);
	}
}

async function main() {
	// When no args are passed, invoke the "full" test script
	if (filenames.length === 0) {
		await runAll();
	} else {
		await runFiles();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
