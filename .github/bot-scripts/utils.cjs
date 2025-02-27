const path = require("path");
const { formatWithDprint: format } = require("@zwave-js/fmt");

const repoRoot = path.join(__dirname, "../..");

/**
 * @param {string} filename
 * @param {string} sourceText
 */
function formatWithDprint(filename, sourceText) {
	return format(repoRoot, filename, sourceText);
}

const urls = {
	styleGuide:
		"https://zwave-js.github.io/zwave-js/#/config-files/style-guide",
};

module.exports = {
	formatWithDprint,
	urls,
};
