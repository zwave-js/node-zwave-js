import { eslintCompatPlugin, type Plugin } from "@oxlint/plugins";

import { autoUnsigned } from "./rules/auto-unsigned.js";
import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { consistentCCValueDefinitions } from "./rules/consistent-cc-value-definitions.js";
import { consistentConfigStringCase } from "./rules/consistent-config-string-case.js";
import { consistentDeviceConfigPropertyOrder } from "./rules/consistent-device-config-property-order.js";
import { consistentImportDeclarations } from "./rules/consistent-import-declarations.js";
import { consistentMockNodeBehaviors } from "./rules/consistent-mock-node-behaviors.js";
import { consistentParamUnits } from "./rules/consistent-param-units.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";
import {
	noDisallowedDefaultValue,
	noDisallowedOptionValues,
} from "./rules/no-disallowed-values.js";
import { noForbiddenImports } from "./rules/no-forbidden-imports.js";
import { noInternalCCTypes } from "./rules/no-internal-cc-types.js";
import { noMisspelledNames } from "./rules/no-misspelled-names.js";
import { noSurroundingWhitespace } from "./rules/no-surrounding-whitespace.js";
import { noUncheckedBytesReads } from "./rules/no-unchecked-bytes-reads.js";
import { noUnexpectedParseErrors } from "./rules/no-unexpected-parse-errors.js";
import { noUnnecessaryBytesFrom } from "./rules/no-unnecessary-bytes-from.js";
import { noUnnecessaryMinMaxValue } from "./rules/no-unnecessary-min-max-value.js";
import { noUselessDescription } from "./rules/no-useless-description.js";
import { noValueInOptionLabel } from "./rules/no-value-in-option-label.js";
import { noWorkspaceSelfImport } from "./rules/no-workspace-self-import.js";
import { preferDefaultValue } from "./rules/prefer-defaultvalue.js";
import { validAllowedValues } from "./rules/valid-allowed-values.js";

const oxlintCompatibleRules = eslintCompatPlugin({
	meta: {
		name: "@zwave-js/eslint-plugin",
	},
	rules: {
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
		"consistent-cc-value-definitions": consistentCCValueDefinitions,
		"no-debug-in-tests": noDebugInTests,
		"no-internal-cc-types": noInternalCCTypes,
		"no-unchecked-bytes-reads": noUncheckedBytesReads,
		"no-unexpected-parse-errors": noUnexpectedParseErrors,
		"no-unnecessary-bytes-from": noUnnecessaryBytesFrom,
		"no-workspace-self-import": noWorkspaceSelfImport,
	},
} as unknown as Plugin).rules;

export default {
	meta: {
		name: "@zwave-js/eslint-plugin",
	},
	rules: {
		"auto-unsigned": autoUnsigned,
		"consistent-config-string-case": consistentConfigStringCase,
		"consistent-device-config-property-order":
			consistentDeviceConfigPropertyOrder,
		"consistent-import-declarations": consistentImportDeclarations,
		"consistent-mock-node-behaviors": consistentMockNodeBehaviors,
		"consistent-param-units": consistentParamUnits,
		"no-disallowed-default-value": noDisallowedDefaultValue,
		"no-disallowed-option-values": noDisallowedOptionValues,
		"no-forbidden-imports": noForbiddenImports,
		"no-misspelled-names": noMisspelledNames,
		"no-surrounding-whitespace": noSurroundingWhitespace,
		"no-unnecessary-min-max-value": noUnnecessaryMinMaxValue,
		"no-useless-description": noUselessDescription,
		"no-value-in-option-label": noValueInOptionLabel,
		"prefer-defaultvalue": preferDefaultValue,
		"valid-allowed-values": validAllowedValues,
		...oxlintCompatibleRules,
	},
};
