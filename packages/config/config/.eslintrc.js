/*
 * Custom ESLint rules for device config files
 */

module.exports = {
	root: true,
	parser: "jsonc-eslint-parser",
	plugins: [
		"@zwave-js",
	],
	rules: {
		"@zwave-js/consistent-device-configs": "error",
	}
};
