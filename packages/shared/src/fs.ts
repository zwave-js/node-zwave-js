import fs from "node:fs/promises";
import path from "node:path";
import { getErrorMessage } from "./errors.js";

export async function enumFilesRecursive(
	rootDir: string,
	predicate?: (filename: string) => boolean,
): Promise<string[]> {
	const ret: string[] = [];
	try {
		const filesAndDirs = await fs.readdir(rootDir);
		for (const f of filesAndDirs) {
			const fullPath = path.join(rootDir, f);

			if ((await fs.stat(fullPath)).isDirectory()) {
				ret.push(...(await enumFilesRecursive(fullPath, predicate)));
			} else if (predicate == undefined || predicate(fullPath)) {
				ret.push(fullPath);
			}
		}
	} catch (e) {
		console.error(
			`Cannot read directory: "${rootDir}": ${getErrorMessage(e, true)}`,
		);
	}

	return ret;
}

export async function copyFilesRecursive(
	sourceDir: string,
	targetDir: string,
	predicate?: (filename: string) => boolean,
): Promise<void> {
	const files = await enumFilesRecursive(sourceDir, predicate);
	for (const file of files) {
		const relative = path.relative(sourceDir, file);
		const target = path.join(targetDir, relative);
		await fs.mkdir(path.dirname(target), { recursive: true });
		await fs.copyFile(file, target);
	}
}

export async function readJSON<T = any>(filename: string): Promise<T> {
	const data = await fs.readFile(filename, "utf8");
	return JSON.parse(data);
}

export async function pathExists(filename: string): Promise<boolean> {
	return fs.access(filename)
		.then(() => true)
		.catch(() => false);
}
