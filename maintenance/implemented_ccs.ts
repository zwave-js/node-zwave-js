/* eslint-disable @typescript-eslint/no-floating-promises */
require("reflect-metadata");
import * as c from "ansi-colors";
import * as clipboard from "clipboardy";
import * as fs from "fs-extra";
import * as path from "path";
import * as yargs from "yargs";
import { CommandClasses } from "../packages/core";
import { num2hex } from "../packages/shared";

const ccRegex = /^@commandClass\(CommandClasses(?:\.|\[")(.+?)(?:"\])?\)/m;
const versionRegex = /^@implementedVersion\((\d+)\)/m;
const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const noApiRegex = /^\/\/ @noAPI/m; // This comment marks a CC that needs no API
const setValueApiRegex = /^\tprotected \[SET_VALUE\]/m;
const noSetValueApiRegex = /^\/\/ @noSetValueAPI/m; // This comment marks a CC that needs no setValue API
const interviewRegex = /^\tpublic async interview/m;
const noInterviewRegex = /^\/\/ @noInterview/m; // This comment marks a CC that needs no interview procedure

const onlyIncomplete = !!yargs.argv.onlyIncomplete;

function getSafeLength(str: string): number {
	return c.stripColor(str).length;
}

function padEnd(str: string, len: number): string {
	return str + " ".repeat(len - getSafeLength(str));
}

interface CCInfo {
	version: number;
	API: boolean;
	setValue: boolean;
	interview: boolean;
}

(async () => {
	const ccDir = path.join(
		__dirname,
		"..",
		"packages/zwave-js/src/lib/commandclass",
	);
	const ccFiles = (await fs.readdir(ccDir))
		.filter((file) => file.endsWith(".ts") && !file.endsWith("test.ts"))
		.map((file) => path.join(ccDir, file));

	const allCCs = new Map<string, CCInfo>(
		Object.keys(CommandClasses)
			.filter((cc) => Number.isNaN(+cc))
			.map((name) => [
				name,
				{ version: 0, API: false, setValue: false, interview: false },
			]),
	);

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(ccFile, "utf8");
		try {
			const ccName = ccRegex.exec(fileContent)![1];
			const ccVersion = +versionRegex.exec(fileContent)![1];
			const hasAPI =
				apiRegex.test(fileContent) || noApiRegex.test(fileContent);
			const setValue =
				(hasAPI && setValueApiRegex.test(fileContent)) ||
				noApiRegex.test(fileContent) ||
				noSetValueApiRegex.test(fileContent);
			const interview =
				interviewRegex.test(fileContent) ||
				noInterviewRegex.test(fileContent);
			allCCs.set(ccName, {
				version: ccVersion,
				API: hasAPI,
				setValue,
				interview,
			});
		} catch (e) {
			/* ok */
		}
	}

	const headers = [
		"",
		"CC name",
		"Version",
		"Interview?",
		"API?",
		"setValue?",
	];
	const rows: string[][] = [];

	for (const [
		name,
		{ version, interview, API, setValue },
	] of allCCs.entries()) {
		const { version: latest, deprecated, obsolete } = getLatestVersion(
			name,
		);
		if (obsolete) continue;
		const implementationStatus =
			version === latest && interview && API && setValue
				? "done"
				: version > 0
				? "in progress"
				: "none";
		const overallColor =
			implementationStatus === "done"
				? c.green
				: implementationStatus === "in progress"
				? c.yellow
				: deprecated
				? c.reset
				: c.red;
		const versionColor =
			version === latest
				? c.green
				: version > 0
				? c.yellow
				: deprecated
				? c.reset
				: c.red;
		const implementedVersion = versionColor(
			version > 0 ? version.toString() : "-",
		);
		const hasInterview = interview ? c.green(" ✓ ") : c.red(" ✗ ");
		const hasAPI = API ? c.green(" ✓ ") : c.red(" ✗ ");
		const hasSetValue = setValue ? c.green(" ✓ ") : c.red(" ✗ ");
		const prefix =
			implementationStatus === "done"
				? "✓"
				: implementationStatus === "in progress"
				? "✍"
				: "✗";
		const postfix = deprecated ? " " + c.reset("(deprecated)") : "";
		if (implementationStatus !== "done" || !onlyIncomplete) {
			rows.push([
				overallColor(prefix),
				overallColor(name + postfix),
				`${implementedVersion} (${latest})`,
				hasInterview,
				hasAPI,
				hasSetValue,
			]);
		}
	}
	writeTable(
		[headers, ...rows],
		yargs.argv.flavor === "github" ? "github" : "console",
	);
})();

function writeTable(rows: string[][], flavor: "console" | "github"): void {
	const numColumns = rows[0].length;
	if (flavor === "console") {
		const columnLenghts: number[] = [];
		for (let col = 0; col < numColumns; col++) {
			columnLenghts.push(
				Math.max(...rows.map((row) => getSafeLength(row[col]))),
			);
		}
		const HR =
			"|-" +
			columnLenghts.map((len) => "-".repeat(len)).join("-|-") +
			"-|";

		console.log(HR);
		for (let i = 0; i < rows.length; i++) {
			const row =
				"| " +
				rows[i]
					.map((r, ri) => padEnd(r, columnLenghts[ri]))
					.join(" | ") +
				" |";
			console.log(row);
			if (i === 0) console.log(HR);
		}
		console.log(HR);
	} /*if (flavor === "github")*/ else {
		let output = "";
		let HR = "|";
		for (let i = 0; i < numColumns; i++) HR += " --- |";

		for (let i = 0; i < rows.length; i++) {
			const row = "| " + rows[i].join(" | ") + " |";
			output += row + "\n";
			if (i === 0) output += HR + "\n";
		}

		console.log(output);
		if (!process.env.CI) {
			clipboard.write(c.stripColor(output));
			console.log(c.green("The table was copied to the clipboard!"));
		}
	}
}

// Taken from SDS13548
const ccVersions: Record<
	string,
	| { version: string | number; deprecated?: boolean; obsolete?: boolean }
	| undefined
> = {
	"0x9C": { version: 1, deprecated: true },
	"0x9D": { version: 1 },
	"0x5D": { version: 2 },
	"0x22": { version: 1 },
	"0x85": { version: 3 },
	"0x9B": { version: 1 },
	"0x59": { version: 3 },
	"0xA1": { version: 1 },
	"0xA2": { version: 1 },
	"0x66": { version: 1 },
	"0x20": { version: 2 },
	"0x36": { version: 1 },
	"0x80": { version: 2 },
	"0x30": { version: 2, deprecated: true },
	"0x25": { version: 2 },
	"0x46": { version: 1, deprecated: true },
	"0x5B": { version: 3 },
	"0x81": { version: 1 },
	"0x33": { version: 3 },
	"0x70": { version: 4 },
	"0x21": { version: 1 },
	"0x56": { version: 1, deprecated: true },
	"0x3A": { version: 1 },
	"0x3B": { version: 1 },
	"0x5A": { version: 1 },
	"0x62": { version: 4 },
	"0x4C": { version: 1 },
	"0x90": { version: 1 },
	"0x6F": { version: 1 },
	"0x7A": { version: 7 },
	"0xA3": { version: 1 },
	"0x8C": { version: 1 },
	"0x7B": { version: 1, deprecated: true },
	"0x37": { version: 1 },
	"0x39": { version: 1 },
	"0x6D": { version: 2 },
	"0x6E": { version: 1 },
	"0x64": { version: 2 },
	"0x74": { version: 1 },
	"0x87": { version: 3 },
	"0x5C": { version: 1 },
	"0xA0": { version: 1 },
	"0x6B": { version: 1 },
	"0x89": { version: 1 },
	"0x76": { version: 1, deprecated: true },
	"0x69": { version: 1 },
	"0x91": { version: 1 },
	"0x72": { version: 2 },
	"0x32": { version: 6 },
	"0x3C": { version: 1 },
	"0x3D": { version: 3 },
	"0x3E": { version: 1 },
	"0x60": { version: 4 },
	"0x8E": { version: 4 },
	"0x8F": { version: 1 },
	"0x31": { version: 11 },
	"0x26": { version: 4 },
	"0x29": { version: 1, deprecated: true },
	"0x4D": { version: 2 },
	"0x34": { version: 3 },
	"0x67": { version: 2 },
	"0x52": { version: 2 },
	"0x00": { version: 1 },
	"0x77": { version: 1 },
	"0x78": { version: 1 },
	"0x71": { version: 8 },
	"0x73": { version: 1 },
	"0x3F": { version: 1 },
	"0x41": { version: 1 },
	"0x88": { version: 1, deprecated: true },
	"0x75": { version: 2 },
	"0x35": { version: 1, deprecated: true },
	"0x48": { version: 1 },
	"0x49": { version: 1 },
	"0x2B": { version: 1 },
	"0x2C": { version: 1 },
	"0x2D": { version: 1 },
	"0x53": { version: 4 },
	"0x4E": { version: 3, deprecated: true },
	"0x93": { version: 2 },
	"0x92": { version: 2 },
	"0x98": { version: 1 },
	"0x9F": { version: 1 },
	"0x94": { version: 4 },
	"0x79": { version: 2 },
	"0x6C": { version: 1 },
	"0x4A": { version: 1 },
	"0x4B": { version: 1 },
	"0x44": { version: 5 },
	"0x45": { version: 2 },
	"0x40": { version: 3 },
	"0x42": { version: 2 },
	"0x47": { version: 1 },
	"0x43": { version: 3 },
	"0x8A": { version: 2 },
	"0x8B": { version: 1 },
	"0x55": { version: 2 },
	"0x63": { version: 2 },
	"0x86": { version: 3 },
	"0x84": { version: 2 },
	"0x6A": { version: 1 },
	"0x23": { version: 4 },
	"0x4F": { version: 1 },
	"0x5F": { version: 1 },
	"0x68": { version: 1 },
	"0x58": { version: 1 },
	"0x61": { version: 1 },
	"0x5E": { version: 2 },
};

function getLatestVersion(ccName: string) {
	const cc = (CommandClasses[ccName as any] as any) as number;
	const version = ccVersions[num2hex(cc, true)];
	if (version == undefined) {
		return { version: 0, obsolete: true };
	}
	return version;
}
