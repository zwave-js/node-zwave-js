/*!
 * This script generates the interface `CCAPIs` in `src/lib/commandclass/API.ts`
 * which is used to strongly-type the simplified API exposed via
 * `ZWaveNode.commandClasses.xyz`
 */

import { formatWithPrettier } from "@zwave-js/maintenance";
import * as fs from "fs-extra";
import * as path from "path";

const apiRegex = /^@API\(CommandClasses(?:\.|\[)(.+?)(?:\])?\)/m;
const valuesDefinitionRegex = /export const ([^\s]+CCValues) =/;
const ccDir = path.join(__dirname, "..", "src/cc");
const libDir = path.join(__dirname, "..", "src/lib");
const valuesFile = path.join(libDir, "Values.ts");

const startTokenInterface = "\t// AUTO GENERATION BELOW";
const endTokenInterface = "}";

process.on("unhandledRejection", (r) => {
	throw r;
});

export async function generateCCValuesInterface(): Promise<void> {
	const ccFiles = (await fs.readdir(ccDir)).filter(
		(file) => file.endsWith(".ts") && !file.endsWith("test.ts"),
	);

	const CCsWithValues: { name: string; className: string; file: string }[] =
		[];

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(path.join(ccDir, ccFile), "utf8");
		// Extract the CC name from e.g. `@API(CommandClasses["Binary Sensor"])`
		const apiMatch = apiRegex.exec(fileContent);
		// Extract the class name from e.g. `export class BasicCCAPI extends CCAPI`
		const classMatch = valuesDefinitionRegex.exec(fileContent);
		if (apiMatch && classMatch) {
			CCsWithValues.push({
				file: ccFile.replace(/\.ts$/, ""),
				name: apiMatch[1],
				className: classMatch[1],
			});
		}
	}

	console.log(`Found ${CCsWithValues.length} CC value definitions...`);

	const originalValuesFileContent = await fs.readFile(valuesFile, "utf8");
	let valuesFileContent = originalValuesFileContent;

	// Generate interface
	const startTokenEnd =
		valuesFileContent.indexOf(startTokenInterface) +
		startTokenInterface.length;
	const endTokenStart = valuesFileContent.indexOf(
		endTokenInterface,
		startTokenEnd,
	);
	valuesFileContent =
		valuesFileContent.slice(0, startTokenEnd) +
		"\n" +
		CCsWithValues.map(
			({ name, className, file }) =>
				`\t${name}: typeof import("${path
					.relative(libDir, ccDir)
					.replace(/\\/g, "/")}/${file}").${className};`,
		).join("\n") +
		"\n" +
		valuesFileContent.slice(endTokenStart);

	valuesFileContent = formatWithPrettier(valuesFile, valuesFileContent);
	// Only update file if necessary - this reduces build time
	if (valuesFileContent !== originalValuesFileContent) {
		console.log("API interface changed");
		await fs.writeFile(valuesFile, valuesFileContent, "utf8");
	}
}

if (require.main === module) void generateCCValuesInterface();
