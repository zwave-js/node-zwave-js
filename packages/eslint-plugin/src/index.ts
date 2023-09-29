import { autoUnsigned } from "./rules/auto-unsigned.js";
import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { consistentConfigLabels } from "./rules/consistent-config-labels.js";
import { consistentDeviceConfigPropertyOrder } from "./rules/consistent-device-config-property-order.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";
import { noForbiddenImports } from "./rules/no-forbidden-imports.js";
import { noUnnecessaryMinMaxValue } from "./rules/no-unnecessary-min-max-value.js";

module.exports = {
	rules: {
		"no-debug-in-tests": noDebugInTests,
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
		"no-forbidden-imports": noForbiddenImports,
		"consistent-device-config-property-order":
			consistentDeviceConfigPropertyOrder,
		"no-unnecessary-min-max-value": noUnnecessaryMinMaxValue,
		"auto-unsigned": autoUnsigned,
		"consistent-config-labels": consistentConfigLabels,
	},
};
