/*
 * Custom ESLint rules for device config files
 */

module.exports = {
	root: true,
	parser: "jsonc-eslint-parser",
	plugins: [
		"@zwave-js",
	],
	extends: "plugin:@zwave-js/config-files"
};
