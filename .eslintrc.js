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

module.exports = {
	parser: "@typescript-eslint/parser", // Specifies the ESLint parser
	parserOptions: {
		ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
		sourceType: "module", // Allows for the use of imports
		project: "./tsconfig.eslint.json",
	},
	extends: [
		// Use the recommended rules from the @typescript-eslint/eslint-plugin
		"plugin:@typescript-eslint/recommended",
		"plugin:@typescript-eslint/recommended-requiring-type-checking",
		// Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
		"plugin:prettier/recommended",
	],
	plugins: [],
	reportUnusedDisableDirectives: true,
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
		// We can turn this on from time to time but in general these rules
		// make our lives harder instead of easier
		"@typescript-eslint/no-unsafe-argument": "off",
		"@typescript-eslint/no-unsafe-assignment": "off",
		"@typescript-eslint/no-unsafe-member-access": "off",
		"@typescript-eslint/no-unsafe-return": "off",
		"@typescript-eslint/no-unsafe-call": "off",

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
	},
	overrides: [
		{
			files: ["*.test.ts"],
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
				"@typescript-eslint/no-unused-vars": "warn",
			},
		},
		{
			files: ["*.js"],
			rules: {
				"@typescript-eslint/*": "off",
			},
		},
	],
};
