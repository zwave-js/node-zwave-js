import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { consistentDeviceConfigPropertyOrder } from "./rules/consistent-device-config-property-order.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";
import { noForbiddenImports } from "./rules/no-forbidden-imports.js";

module.exports = {
	rules: {
		"no-debug-in-tests": noDebugInTests,
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
		"no-forbidden-imports": noForbiddenImports,
		"consistent-device-config-property-order":
			consistentDeviceConfigPropertyOrder,
	},
};
