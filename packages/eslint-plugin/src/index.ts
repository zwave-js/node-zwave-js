import { ccAPIValidateArgs } from "./rules/ccapi-validate-args.js";
import { noDebugInTests } from "./rules/no-debug-in-tests.js";

module.exports = {
	rules: {
		"no-debug-in-tests": noDebugInTests,
		"ccapi-validate-args": ccAPIValidateArgs,
	},
};
