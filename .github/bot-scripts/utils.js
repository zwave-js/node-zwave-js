const prettier = require("prettier");

function formatWithPrettier(filename, sourceText) {
	const prettierOptions = {
		...require("../../.prettierrc"),
		// To infer the correct parser
		filepath: filename,
	};
	return prettier.format(sourceText, prettierOptions);
}

const urls = {
	styleGuide:
		"https://zwave-js.github.io/node-zwave-js/#/config-files/style-guide",
};

module.exports = {
	formatWithPrettier,
	urls,
};
