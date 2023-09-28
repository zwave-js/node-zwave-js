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
		"@zwave-js/consistent-device-config-property-order": "error",
		"@zwave-js/no-unnecessary-min-max-value": "error",
		"@zwave-js/auto-unsigned": "error",
	}
};
