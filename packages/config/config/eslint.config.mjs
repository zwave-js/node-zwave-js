/*
	Note to future self:

	If ESLint is ever extremely slow again, check if there are .js and/or .map files in the source directories
	and delete them:

	```bash
	find . -type f -name "*.map" | grep ./packages | grep /src/ | xargs -n1 rm
	find . -type f -name "*.js" | grep ./packages | grep /src/ | xargs -n1 rm
	```

	Running `TIMING=1 DEBUG=eslint:cli-engine yarn run lint:ts` helps detect the problem
*/

// @ts-check

import zjs from "@zwave-js/eslint-plugin";
import jsonc from "jsonc-eslint-parser";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

// Figure out the files glob depending on where ESLint is executed from
const __dirname = dirname(fileURLToPath(import.meta.url));
const rel = relative(process.cwd(), __dirname);
const glob = join(rel, "devices/**/*.json");

export default {
	files: [glob],
	plugins: {
		"@zwave-js": zjs,
	},
	languageOptions: {
		parser: jsonc,
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
