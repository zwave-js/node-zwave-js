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

import tseslint from "typescript-eslint";
import deprecation from "eslint-plugin-deprecation";
import unusedImports from "eslint-plugin-unused-imports";
import unicorn from "eslint-plugin-unicorn";
import zjs from "@zwave-js/eslint-plugin";
import jsonc from "jsonc-eslint-parser";

export default tseslint.config(
	...tseslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				project: "./tsconfig.eslint.json",
			},
		},
		linterOptions: {
			reportUnusedDisableDirectives: true,
		},
		plugins: {
			deprecation,
			"unused-imports": unusedImports,
			unicorn,
			"@zwave-js": zjs,
		},
		rules: {
			// Place to specify ESLint rules. Can be used to overwrite rules specified from the extended configs
			"@typescript-eslint/no-parameter-properties": "off",
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-use-before-define": [
				"error",
				{
					functions: false,
					typedefs: false,
					classes: false,
				},
			],
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					ignoreRestSiblings: true,
					argsIgnorePattern: "^_",
				},
			],
			"@typescript-eslint/no-object-literal-type-assertion": "off",
			"@typescript-eslint/interface-name-prefix": "off",
			"@typescript-eslint/no-non-null-assertion": "off", // This is necessary for Map.has()/get()!
			"@typescript-eslint/no-inferrable-types": [
				"error",
				{
					ignoreProperties: true,
					ignoreParameters: true,
				},
			],
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-expect-error": false,
					"ts-ignore": true,
					"ts-nocheck": true,
					"ts-check": false,
				},
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
					allowBoolean: true,
					// This is necessary to log errors
					// TODO: Consider switching to false when we may annotate catch clauses
					allowAny: true,
					allowNullish: true,
				},
			],
			"@typescript-eslint/no-misused-promises": [
				"error",
				{
					checksVoidReturn: false,
				},
			],

			// Make sure type imports are used where necessary
			"@typescript-eslint/consistent-type-imports": [
				"error",
				{
					fixStyle: "inline-type-imports",
					disallowTypeAnnotations: false,
				},
			],
			"@typescript-eslint/consistent-type-exports": "error",

			// We can turn this on from time to time but in general these rules
			// make our lives harder instead of easier
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-enum-comparison": "off",
			"@typescript-eslint/no-unsafe-declaration-merging": "off",

			// Although this rule makes sense, it takes about a second to execute (and we don't need it)
			"@typescript-eslint/no-implied-eval": "off",

			"@typescript-eslint/explicit-module-boundary-types": [
				"warn",
				{ allowArgumentsExplicitlyTypedAsAny: true },
			],
			"@typescript-eslint/no-this-alias": "off",

			// Prefer simple property access and declaration without quotes
			"dot-notation": "off",
			"@typescript-eslint/dot-notation": [
				"error",
				{
					allowPrivateClassPropertyAccess: true,
					allowProtectedClassPropertyAccess: true,
				},
			],
			"quote-props": ["error", "as-needed"],
			"deprecation/deprecation": "error",
			"unused-imports/no-unused-imports-ts": "error",
			"unused-imports/no-unused-imports": "error",

			"unicorn/prefer-array-find": ["error", { checkFromLast: true }],
			"unicorn/prefer-array-flat-map": "error",
			"unicorn/prefer-array-flat": "error",
			"unicorn/prefer-array-index-of": "error",
			"unicorn/prefer-array-some": "error",
			"unicorn/prefer-at": "error",
			"unicorn/prefer-includes": "error",
			"unicorn/prefer-logical-operator-over-ternary": "error",
			"unicorn/prefer-modern-math-apis": "error",
			"unicorn/prefer-negative-index": "error",
			"unicorn/prefer-node-protocol": "error",
			"unicorn/prefer-regexp-test": "error",
			"unicorn/prefer-string-slice": "error",
			"unicorn/prefer-string-starts-ends-with": "error",
			"unicorn/prefer-string-replace-all": "error",
		},
	},
	// Disable unnecessarily strict rules for test files
	{
		files: ["*.test.ts", "*.test.ava.ts"],
		rules: {
			"@typescript-eslint/explicit-function-return-type": "off",
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/ban-ts-comment": "off",
			"@typescript-eslint/no-unsafe-argument": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-member-return": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/require-await": "off",
			"@typescript-eslint/unbound-method": "off",
			"@typescript-eslint/no-unused-vars": "off",
			"@typescript-eslint/dot-notation": "off",

			"@zwave-js/no-debug-in-tests": "error",
		},
	},
	// Disable all TS-related rules for JS files
	{
		files: ["*.js"],
		rules: {
			"@typescript-eslint/*": "off",
		},
	},
	// Enable rules from the local plugin for relevant files
	{
		files: ["packages/cc/src/**/*CC.ts"],
		rules: {
			"@zwave-js/ccapi-validate-args": "error",
			"@zwave-js/no-internal-cc-types": "error",
		},
	},
	{
		files: ["packages/cc/src/**"],
		rules: {
			"@zwave-js/consistent-cc-classes": "error",
		},
	},
	{
		files: ["packages/**/*.ts"],
		rules: {
			"@zwave-js/no-forbidden-imports": "error",
		},
	},
	{
		files: ["packages/config/config/devices/**/*.json"],
		...zjs.configs.co
		languageOptions: {
			parser: jsonc,
		},
		rules: {
			"@zwave-js/consistent-device-configs": "error",
		},
	}
);
