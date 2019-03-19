// tslint:disable: no-console
// tslint:disable-next-line: no-var-requires
require("reflect-metadata");
import * as c from "ansi-colors";
import * as fs from "fs-extra";
import * as path from "path";
import { CommandClasses } from "../src/lib/commandclass/CommandClass";
import { num2hex } from "../src/lib/util/strings";

const ccRegex = /^@commandClass\(CommandClasses(?:\.|\[")(.+?)(?:"\])?\)$/m;
const versionRegex = /^@implementedVersion\((\d+)\)$/m;

function padEnd(str: string, len: number) {
	return str + " ".repeat(len - str.length);
}

(async () => {
	const ccDir = path.join(__dirname, "..", "src/lib/commandclass");
	const ccFiles = (await fs.readdir(ccDir))
		.filter(file => !file.endsWith("test.ts"))
		.map(file => path.join(ccDir, file))
		;

	const allCCs = new Map(Object.keys(CommandClasses)
		.filter(cc => Number.isNaN(+cc))
		.map(name => [name, 0] as [string, number]),
	);

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(ccFile, "utf8");
		try {
			const ccName = ccRegex.exec(fileContent)[1];
			const ccVersion = +versionRegex.exec(fileContent)[1];
			allCCs.set(ccName, ccVersion);
		} catch (e) { /* ok */ }
	}

	const longestName = Math.max(...[...allCCs.keys()].map(str => str.length));
	const col2Header = "Implemented version";
	const col2Length = col2Header.length;
	const col3Header = "max.";
	const col3Length = col3Header.length;

	console.log();
	const HR = `|-${"-".repeat(longestName)}-|-${"-".repeat(col2Length)}-|-${"-".repeat(col3Length)}-|`;
	console.log(HR);
	console.log(`| ${padEnd("Command class name", longestName)} | ${col2Header} | ${col3Header} |`);
	console.log(HR);
	for (const [name, version] of allCCs.entries()) {
		const latest = getLatestVersion(name);
		const color = version === latest ? c.green
			: version > 0 ? c.yellow
				: c.red;
		console.log(`| ${color(padEnd(name, longestName))} | ${color(padEnd(version > 0 ? `Version ${version}` : "not implemented", col2Length))} | ${padEnd(latest.toString(), col3Length)} |`);
	}
	console.log(HR);
})();

function getLatestVersion(ccName: string) {
	const cc = CommandClasses[ccName as any] as any as number;
	const version = ccVersions[num2hex(cc, true)];
	return version;
}

// Taken from https://www.silabs.com/documents/login/miscellaneous/SDS13781-Z-Wave-Application-Command-Class-Specification.pdf
const ccVersions: Record<string, any> = {
	"0x9C": 1,
	"0x9D": 1,
	"0x27": 1,
	"0x5D": 2,
	"0x57": 1,
	"0x22": 1,
	"0x85": 2,
	"0x9B": 1,
	"0x59": 3,
	"0x66": 1,
	"0x20": 2,
	"0x36": 1,
	"0x50": 1,
	"0x80": 1,
	"0x30": 2,
	"0x25": 2,
	"0x28": 1,
	"0x46": 1,
	"0x5B": 3,
	"0x81": 1,
	"0x33": 3,
	"0x70": 4,
	"0x21": 1,
	"0x56": 1,
	"0x3A": 1,
	"0x3B": 1,
	"0x5A": 1,
	"0x62": 4,
	"0x4C": 1,
	"0x90": 1,
	"0x6F": 1,
	"0x7A": 5,
	"0x8C": 1,
	"0x7B": 1,
	"0x82": 1,
	"0x37": 1,
	"0x39": 1,
	"0x6D": 2,
	"0x6E": 1,
	"0x64": 2,
	"0x74": 1,
	"0x87": 3,
	"0x5C": 1,
	"0x9A": 1,
	"0x6B": 1,
	"0x89": 1,
	"0x76": 1,
	"0x69": 1,
	"0x91": 1,
	"0x72": 2,
	"0xEF": "N/A",
	"0x32": 5,
	"0x3C": 1,
	"0x3D": 3,
	"0x3E": 1,
	"0x51": 1,
	"0x60": 4,
	"0x8E": 3,
	"0x8F": 1,
	"0x31": 11,
	"0x26": 4,
	"0x29": 1,
	"0x4D": 2,
	"0x34": 3,
	"0x67": 2,
	"0x54": 1,
	"0x52": 2,
	"0x00": 1,
	"0x77": 1,
	"0x78": 1,
	"0x71": 8,
	"0x73": 1,
	"0x3F": 1,
	"0x41": 1,
	"0x88": 1,
	"0x75": 2,
	"0x35": 1,
	"0x48": 1,
	"0x49": 1,
	"0x7C": 1,
	"0x7D": 1,
	"0x2B": 1,
	"0x2C": 1,
	"0x2D": 1,
	"0x53": 4,
	"0x4E": 3,
	"0x93": 2,
	"0x92": 2,
	"0x98": 1,
	"0x9F": 1,
	"0xF100": "N/A",
	"0x9E": 1,
	"0x94": 4,
	"0x79": 1,
	"0x6C": 1,
	"0x4A": 1,
	"0x4B": 1,
	"0x44": 4,
	"0x45": 2,
	"0x40": 3,
	"0x42": 2,
	"0x47": 1,
	"0x43": 3,
	"0x8A": 2,
	"0x8B": 2,
	"0x55": 2,
	"0x63": 2,
	"0x86": 3,
	"0x84": 2,
	"0x6A": 1,
	"0x23": 4,
	"0x4F": 1,
	"0x5F": 1,
	"0x68": 1,
	"0x58": 1,
	"0x61": 1,
	"0x5E": 2,
};
