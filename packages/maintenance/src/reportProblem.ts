import { red, yellow } from "ansi-colors";

interface ReportProblemOptions {
	severity: "warn" | "error";
	filename: string;
	line?: number;
	message: string;
	annotation?: boolean;
}

export function reportProblem({
	severity,
	filename,
	line,
	message,
	annotation = !!process.env.CI,
}: ReportProblemOptions): void {
	if (annotation) {
		// Since Github hides the filename in the logs if we use the annotation syntax, we need to write it twice
		console.log(`\n${filename}:`);
		console.log(
			`::${severity}${severity === "warn" ? "ing" : ""} file=${filename}${
				line != undefined ? `,line=${line}` : ""
			}::${message.replace(/\n/g, "%0A")}\n`,
		);
	} else {
		console.log(`${filename}${line != undefined ? `:${line}` : ""}:`);
		console.log(
			(severity === "warn" ? yellow : red)(
				`[${severity.toUpperCase()}] ${message}\n`,
			),
		);
	}
}
