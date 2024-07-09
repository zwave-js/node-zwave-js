import { Linter } from "eslint";
import jsoncParser from "jsonc-eslint-parser";
import zjs from "../index.js";

export const configFiles: Linter.FlatConfig = {
	languageOptions: {
		parser: jsoncParser,
	},
	plugins: {
		"@zwave-js": zjs,
	},
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
