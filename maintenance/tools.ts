import { red, yellow } from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";

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
	} catch (err) {
		console.error(`Cannot read directory: "${rootDir}": ${err}`);
	}

	return ret;
}

interface ReportProblemOptions {
	severity: "warn" | "error";
	filename: string;
	line?: number;
	message: string;
}

export function reportProblem({
	severity,
	filename,
	line,
	message,
}: ReportProblemOptions): void {
	if (process.env.CI) {
		console[severity](
			`::${severity}${severity === "warn" ? "ing" : ""} file=${filename}${
				line != undefined ? `,line=${line}` : ""
			}::${message}\n`,
		);
	} else {
		console[severity](
			(severity === "warn" ? yellow : red)(
				`[${severity.toUpperCase()}] ${filename}${
					line != undefined ? `:${line}` : ""
				}:` + `\n${message}\n`,
			),
		);
	}
}
