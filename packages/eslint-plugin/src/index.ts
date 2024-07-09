import { autoUnsigned } from "./rules/auto-unsigned.js";
import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { consistentConfigStringCase } from "./rules/consistent-config-string-case.js";
import { consistentDeviceConfigPropertyOrder } from "./rules/consistent-device-config-property-order.js";
import { consistentParamUnits } from "./rules/consistent-param-units.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";
import { noForbiddenImports } from "./rules/no-forbidden-imports.js";
import { noMisspelledNames } from "./rules/no-misspelled-names.js";
import { noSurroundingWhitespace } from "./rules/no-surrounding-whitespace.js";
import { noUnnecessaryMinMaxValue } from "./rules/no-unnecessary-min-max-value.js";
import { noUselessDescription } from "./rules/no-useless-description.js";
import { noValueInOptionLabel } from "./rules/no-value-in-option-label.js";
import { preferDefaultValue } from "./rules/prefer-defaultvalue.js";

import { configFiles as configFilesConfig } from "./configs/configFiles.js";
import { noInternalCCTypes } from "./rules/no-internal-cc-types.js";

export default {
	rules: {
		"auto-unsigned": autoUnsigned,
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
		"consistent-config-string-case": consistentConfigStringCase,
		"consistent-device-config-property-order":
			consistentDeviceConfigPropertyOrder,
		"consistent-param-units": consistentParamUnits,
		"no-debug-in-tests": noDebugInTests,
		"no-forbidden-imports": noForbiddenImports,
		"no-misspelled-names": noMisspelledNames,
		"no-surrounding-whitespace": noSurroundingWhitespace,
		"no-unnecessary-min-max-value": noUnnecessaryMinMaxValue,
		"no-useless-description": noUselessDescription,
		"no-value-in-option-label": noValueInOptionLabel,
		"prefer-defaultvalue": preferDefaultValue,
		"no-internal-cc-types": noInternalCCTypes,
	},
	configs: {
		"config-files": configFilesConfig,
	},
};
