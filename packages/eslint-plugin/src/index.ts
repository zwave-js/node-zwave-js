import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { consistentCCClasses } from "./rules/consistent-cc-classes.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";

module.exports = {
	rules: {
		"no-debug-in-tests": noDebugInTests,
		"ccapi-validate-args": ccAPIValidateArgs,
		"consistent-cc-classes": consistentCCClasses,
	},
};
