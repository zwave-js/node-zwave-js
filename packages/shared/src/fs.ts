import * as fs from "fs-extra";
import path from "path";
import { getErrorMessage } from ".";

export async function enumFilesRecursive(
	rootDir: string,
	predicate?: (filename: string) => boolean,
): Promise<string[]> {
	const ret: string[] = [];
	try {
		const filesAndDirs = await fs.readdir(rootDir);
		for (const f of filesAndDirs) {
			const fullPath = path.join(rootDir, f);

			if (fs.statSync(fullPath).isDirectory()) {
				ret.push(...(await enumFilesRecursive(fullPath, predicate)));
			} else if (predicate?.(fullPath)) {
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
