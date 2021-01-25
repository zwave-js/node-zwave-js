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
		// Since Github hides the filename in the logs if we use the annotation syntax, we need to write it twice
		console[severity](
			`::${severity}${severity === "warn" ? "ing" : ""} file=${filename}${
				line != undefined ? `,line=${line}` : ""
			}::${filename}:%0A${message.replace(/\n/g, "%0A")}\n`,
		);
	} else {
		console[severity](
			(severity === "warn" ? yellow : red)(
				`${filename}${
					line != undefined ? `:${line}` : ""
				}:\n[${severity.toUpperCase()}] ${message}\n`,
			),
		);
	}
}
