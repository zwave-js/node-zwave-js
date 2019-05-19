import * as fs from "fs-extra";
import * as path from "path";

const apiRegex = /^@API\(([^\)]+)\)/m;
const ccDir = path.join(__dirname, "..", "src/lib/commandclass");
const apiFile = path.join(ccDir, "API.ts");
const startToken = "export interface CCAPIs {";
const endToken = "}";

(async () => {
	const ccFiles = (await fs.readdir(ccDir)).filter(
		file => !file.endsWith("test.ts"),
	);

	const CCsWithAPI: { name: string; className: string; file: string }[] = [];

	for (const ccFile of ccFiles) {
		const fileContent = await fs.readFile(path.join(ccDir, ccFile), "utf8");
		const match = apiRegex.exec(fileContent);
		if (match) {
			const apiClass = match[1];
			CCsWithAPI.push({
				file: ccFile.replace(/\.ts$/, ""),
				className: apiClass,
				name: apiClass.replace("CCAPI", ""),
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
				`\t${name}: typeof import("./${file}").${className};`,
		).join("\n") +
		"\n" +
		apiFileContent.substr(endTokenStart);
	await fs.writeFile(apiFile, apiFileContent, "utf8");
})();
