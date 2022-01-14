const prettier = require("prettier");

function formatWithPrettier(filename, sourceText) {
	const prettierOptions = {
		...require("../../.prettierrc"),
		// To infer the correct parser
		filepath: filename,
	};
	return prettier.format(sourceText, prettierOptions);
}

module.exports = {
	formatWithPrettier,
};
