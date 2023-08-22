// const prettier = require("prettier");
const fs = require("fs");
const path = require("path");
const JSON5 = require("json5");

const jsonGetPath = require("@dprint/json").getPath;
const tsGetPath = require("@dprint/typescript").getPath;
const mdGetPath = require("@dprint/markdown").getPath;
const { createFromBuffer } = require("@dprint/formatter");

const repoRoot = path.join(__dirname, "../..");
const dprintConfigPath = path.join(
	repoRoot,
	"packages/config/config/.dprint.jsonc",
);

// function formatWithPrettier(filename, sourceText) {
// 	const prettierOptions = {
// 		...require("../../.prettierrc"),
// 		// To infer the correct parser
// 		filepath: filename,
// 	};
// 	return prettier.format(sourceText, prettierOptions);
// }

const dprintFormatterCache = new Map();

let dprintConfig;
function getDprintConfig() {
	if (!dprintConfig) {
		const fileContent = fs.readFileSync(
			dprintConfigPath,
			"utf8",
		);
		const {
			lineWidth,
			useTabs,
			indentWidth,
			newLineKind,
			typescript,
			json,
			markdown,
		} = JSON5.parse(fileContent);
		dprintConfig = {
			global: {
				lineWidth,
				useTabs,
				indentWidth,
				newLineKind,
			},
			".ts": typescript,
			".json": json,
			".md": markdown,
		};
	}
	return dprintConfig;
}

function getDprintFormatter(filename) {
	let extension = path.extname(filename);
	if (extension === ".ts" || extension === ".js") {
		extension = ".ts";
	}
	if (!dprintFormatterCache.has(extension)) {
		let buffer;
		if (extension === ".ts" || extension === ".js") {
			extension = ".ts";
			buffer = fs.readFileSync(tsGetPath());
		} else if (extension === ".json") {
			buffer = fs.readFileSync(jsonGetPath());
		} else if (extension === ".md") {
			buffer = fs.readFileSync(mdGetPath());
		} else {
			throw new Error(`Unsupported extension: ${extension}`);
		}
		const formatter = createFromBuffer(buffer);
		const config = getDprintConfig();
		formatter.setConfig(config.global, config[extension] ?? {});
		dprintFormatterCache.set(extension, formatter);
	}
	return dprintFormatterCache.get(extension);
}

function formatWithDprint(filename, sourceText) {
	const formatter = getDprintFormatter(filename);
	return formatter.formatText(filename, sourceText);
}

const urls = {
	styleGuide:
		"https://zwave-js.github.io/node-zwave-js/#/config-files/style-guide",
};

module.exports = {
	// formatWithPrettier,
	formatWithDprint,
	urls,
};
