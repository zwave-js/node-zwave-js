import { type ESLint } from "eslint";

export const configFiles: ESLint.ConfigData = {
	parser: "jsonc-eslint-parser",
	plugins: [
		"@zwave-js",
	],
	rules: {
		"@zwave-js/auto-unsigned": "error",
		"@zwave-js/consistent-config-string-case": "error",
		"@zwave-js/consistent-device-config-property-order": "error",
		"@zwave-js/consistent-param-units": "error",
		"@zwave-js/no-misspelled-names": "error",
		"@zwave-js/no-surrounding-whitespace": "error",
		"@zwave-js/no-unnecessary-min-max-value": "error",
		"@zwave-js/no-useless-description": "error",
		"@zwave-js/no-value-in-option-label": "error",
		"@zwave-js/prefer-defaultvalue": "error",
	},
};
