import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { consistentDeviceConfigs } from "./rules/consistent-device-configs.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";
import { noForbiddenImports } from "./rules/no-forbidden-imports.js";

module.exports = {
	rules: {
		"no-debug-in-tests": noDebugInTests,
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
		"no-forbidden-imports": noForbiddenImports,
		"consistent-device-configs": consistentDeviceConfigs,
	},
};
