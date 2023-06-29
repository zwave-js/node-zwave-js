/*!
 * This script generates the interface `CCAPIs` in `src/lib/commandclass/API.ts`
 * which is used to strongly-type the simplified API exposed via
 * `ZWaveNode.commandClasses.xyz`
 */

import { formatWithPrettier } from "@zwave-js/maintenance";
import * as fs from "fs-extra";
import * as path from "path";

const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const classNameRegex = /class ([^\s]+) extends (\w+)?CCAPI/;
const ccDir = path.join(__dirname, "..", "src/cc");
const libDir = path.join(__dirname, "..", "src/lib");
const apiFile = path.join(libDir, "API.ts");
const startTokenType1 = "type CCNameMap = {";
// const startTokenType2 =
// 	"export type CCInstanceToAPI<CC extends CommandClass> =";
const endTokenType = "};";

const startTokenInterface = "\t// AUTO GENERATION BELOW";
const endTokenInterface = "}";

process.on("unhandledRejection", (r) => {
	throw r;
});

export async function generateCCAPIInterface(): Promise<void> {
	const ccFiles = (await fs.readdir(ccDir)).filter(
		(file) => file.endsWith(".ts") && !file.endsWith("test.ts"),
	);

	const CCsWithAPI: { name: string; className: string; file: string }[] = [];

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(path.join(ccDir, ccFile), "utf8");
		// Extract the CC name from e.g. `@API(CommandClasses["Binary Sensor"])`
		const apiMatch = apiRegex.exec(fileContent);
		// Extract the class name from e.g. `export class BasicCCAPI extends CCAPI`
		const classMatch = classNameRegex.exec(fileContent);
		if (apiMatch && classMatch) {
			CCsWithAPI.push({
				file: ccFile.replace(/\.ts$/, ""),
				name: apiMatch[1],
				className: classMatch[1],
			});
		}
	}

	console.log(`Found ${CCsWithAPI.length} API classes...`);

	const originalApiFileContent = await fs.readFile(apiFile, "utf8");
	let apiFileContent = originalApiFileContent;

	// Generate interface
	let startTokenEnd =
		apiFileContent.indexOf(startTokenInterface) +
		startTokenInterface.length;
	let endTokenStart = apiFileContent.indexOf(
		endTokenInterface,
		startTokenEnd,
	);
	apiFileContent =
		apiFileContent.slice(0, startTokenEnd) +
		"\n" +
		CCsWithAPI.map(
			({ name, className, file }) =>
				`\t${name}: import("${path
					.relative(libDir, ccDir)
					.replace(/\\/g, "/")}/${file}").${className};`,
		).join("\n") +
		"\n" +
		apiFileContent.slice(endTokenStart);

	// Generate lookup types (part 1: CCToName)
	startTokenEnd =
		apiFileContent.indexOf(startTokenType1) + startTokenType1.length;
	endTokenStart = apiFileContent.indexOf(endTokenType, startTokenEnd);
	apiFileContent =
		apiFileContent.slice(0, startTokenEnd) +
		"\n" +
		CCsWithAPI.map(({ name }) => {
			if (!name.startsWith(`"`)) name = `"${name}"`;
			return `\t${name}: typeof CommandClasses[${name}]`;
		}).join("\n") +
		"\n" +
		apiFileContent.slice(endTokenStart);

	// // Generate lookup types (part 2: CCInstanceToName)
	// startTokenEnd =
	// 	apiFileContent.indexOf(startTokenType2) + startTokenType2.length;
	// endTokenStart = apiFileContent.indexOf(endTokenType, startTokenEnd);
	// apiFileContent =
	// 	apiFileContent.slice(0, startTokenEnd) +
	// 	"\n" +
	// 	CCsWithAPI.map(({ name, className, file }) => {
	// 		if (!name.startsWith(`"`)) name = `"${name}"`;
	// 		return `\t[CC] extends [import("./${file}").${className.replace(
	// 			/API$/,
	// 			"",
	// 		)}] ? import("./${file}").${className} : `;
	// 	}).join("\n") +
	// 	"\n" +
	// 	apiFileContent.slice(endTokenStart);

	apiFileContent = formatWithPrettier(apiFile, apiFileContent);
	// Only update file if necessary - this reduces build time
	if (apiFileContent !== originalApiFileContent) {
		console.log("API interface changed");
		await fs.writeFile(apiFile, apiFileContent, "utf8");
	}
}

if (require.main === module) void generateCCAPIInterface();
