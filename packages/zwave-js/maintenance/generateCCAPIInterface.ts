/*!
 * This script generates the interface `CCAPIs` in `src/lib/commandclass/API.ts`
 * which is used to strongly-type the simplified API exposed via
 * `ZWaveNode.commandClasses.xyz`
 */

import * as fs from "fs-extra";
import * as path from "path";

const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const classNameRegex = /class ([^\s]+) extends (\w+)?CCAPI/;
const ccDir = path.join(__dirname, "..", "src/lib/commandclass");
const apiFile = path.join(ccDir, "API.ts");
const startToken = "\t// AUTO GENERATION BELOW";
const endToken = "}";

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

	let apiFileContent = await fs.readFile(apiFile, "utf8");
	const startTokenEnd =
		apiFileContent.indexOf(startToken) + startToken.length;
	const endTokenStart = apiFileContent.indexOf(endToken, startTokenEnd);
	apiFileContent =
		apiFileContent.substr(0, startTokenEnd) +
		"\n" +
		CCsWithAPI.map(
			({ name, className, file }) =>
				`\t${name}: import("./${file}").${className};`,
		).join("\n") +
		"\n" +
		apiFileContent.substr(endTokenStart);
	await fs.writeFile(apiFile, apiFileContent, "utf8");
}

if (!module.parent) void generateCCAPIInterface();
