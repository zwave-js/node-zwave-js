/*!
 * This script generates the interface `CCAPIs` in `src/lib/commandclass/API.ts`
 * which is used to strongly-type the simplified API exposed via
 * `ZWaveNode.commandClasses.xyz`
 */

import * as fs from "fs-extra";
import * as path from "path";
import { formatWithPrettier } from "../../maintenance/src/prettier";

const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const classNameRegex = /class ([^\s]+) extends (\w+)?CCAPI/;
const ccDir = path.join(__dirname, "..", "src/lib/commandclass");
const apiFile = path.join(ccDir, "API.ts");
const startTokenType = "export type CCToName<CC extends CommandClasses> =";
const endTokenType = "never;";

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
		apiFileContent.substr(0, startTokenEnd) +
		"\n" +
		CCsWithAPI.map(
			({ name, className, file }) =>
				`\t${name}: import("./${file}").${className};`,
		).join("\n") +
		"\n" +
		apiFileContent.substr(endTokenStart);

	// Generate lookup type
	startTokenEnd =
		apiFileContent.indexOf(startTokenType) + startTokenType.length;
	endTokenStart = apiFileContent.indexOf(endTokenType, startTokenEnd);
	apiFileContent =
		apiFileContent.substr(0, startTokenEnd) +
		"\n" +
		CCsWithAPI.map(({ name }) => {
			if (!name.startsWith(`"`)) name = `"${name}"`;
			return `\t[CC] extends [(typeof CommandClasses[${name}])] ? ${name} : `;
		}).join("\n") +
		"\n" +
		apiFileContent.substr(endTokenStart);

	apiFileContent = formatWithPrettier(apiFile, apiFileContent);
	// Only update file if necessary - this reduces build time
	if (apiFileContent !== originalApiFileContent) {
		console.log("API interface changed");
		await fs.writeFile(apiFile, apiFileContent, "utf8");
	}
}

if (require.main === module) void generateCCAPIInterface();
