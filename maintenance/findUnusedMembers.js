const fs = require("fs");
const ts = require("typescript");
const path = require("path");

// Copied from https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API#incremental-build-support-using-the-language-services
function getLanguageService(rootFileNames, options) {
	const files = {};

	// initialize the list of files
	rootFileNames.forEach((fileName) => {
		files[fileName] = { version: 0 };
	});

	// Create the language service host to allow the LS to communicate with the host
	const servicesHost = {
		getScriptFileNames: () => rootFileNames,
		getScriptVersion: (fileName) =>
			files[fileName] && files[fileName].version.toString(),
		getScriptSnapshot: (fileName) => {
			if (!fs.existsSync(fileName)) {
				return undefined;
			}

			return ts.ScriptSnapshot.fromString(
				fs.readFileSync(fileName).toString(),
			);
		},
		getCurrentDirectory: () => process.cwd(),
		getCompilationSettings: () => options,
		getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
		getProjectVersion: () => 1,
		fileExists: ts.sys.fileExists,
		readFile: ts.sys.readFile,
		readDirectory: ts.sys.readDirectory,
	};

	// Create the language service files
	const services = ts.createLanguageService(
		servicesHost,
		ts.createDocumentRegistry(),
	);

	return services;
}

const tsconfigPath = "tsconfig.json";
const basePath = path.resolve(path.dirname(tsconfigPath));
const parseJsonResult = ts.parseConfigFileTextToJson(
	tsconfigPath,
	fs.readFileSync(tsconfigPath, { encoding: "utf8" }),
);
const tsConfig = ts.parseJsonConfigFileContent(
	parseJsonResult.config,
	ts.sys,
	basePath,
);
const services = getLanguageService(tsConfig.fileNames, tsConfig.options);

// For each non-typings file
tsConfig.fileNames
	.filter((f) => !f.endsWith(".d.ts"))
	.forEach((file) => {
		const source = ts.createSourceFile(
			file,
			fs.readFileSync(file, { encoding: "utf8" }),
			ts.ScriptTarget.ES2018,
		);
		const relativePath = path
			.relative(process.cwd(), source.fileName)
			.replace(/\\/g, "/");
		ts.forEachChild(source, (node) => {
			if (ts.isClassDeclaration(node)) {
				// For each class member
				node.members.forEach((member) => {
					// If member is marked as public or protected and not a constructor
					if (
						(ts.getCombinedModifierFlags(member) &
							ts.ModifierFlags.Public ||
							ts.getCombinedModifierFlags(member) &
								ts.ModifierFlags.Protected) &&
						member.kind !== ts.SyntaxKind.Constructor
					) {
						const references = services.findReferences(
							file,
							member.name.pos + 1,
						);
						// Fail if every reference is a definition and not in a typings file
						if (
							references?.every(
								(reference) =>
									reference.references.length === 1 &&
									reference.references[0].isDefinition &&
									!reference.definition.fileName.endsWith(
										".d.ts",
									),
							)
						) {
							const location = ts.getLineAndCharacterOfPosition(
								source,
								member.getStart(source, false),
							);
							console.error(
								`File: ${relativePath}:${
									location.line + 1
								} , Member: ${member.name.text}`,
							);
						}
					}
				});
			}
		});
	});
