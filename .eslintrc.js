module.exports = {
	parser: "@typescript-eslint/parser", // Specifies the ESLint parser
	parserOptions: {
		ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
		sourceType: "module", // Allows for the use of imports
		project: "./tsconfig.json",
	},
	extends: [
		"plugin:@typescript-eslint/recommended", // Uses the recommended rules from the @typescript-eslint/eslint-plugin
		"prettier/@typescript-eslint", // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
		"plugin:prettier/recommended", // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
	],
	plugins: [],
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
		"@typescript-eslint/explicit-function-return-type": [
			"warn",
			{
				allowExpressions: true,
				allowTypedFunctionExpressions: true,
			},
		],
		"@typescript-eslint/no-object-literal-type-assertion": "off",
		"@typescript-eslint/interface-name-prefix": "off",
		"@typescript-eslint/no-non-null-assertion": "off", // This is necessary for Map.has()/get()!
		"@typescript-eslint/no-inferrable-types": [
			"error",
			{
				"ignoreProperties": true,
				"ignoreParameters": true
			}
		],
		"@typescript-eslint/ban-ts-ignore": "warn",
	},
	overrides: [
		{
			files: ["*.test.ts"],
			rules: {
				"@typescript-eslint/explicit-function-return-type": "off",
				"@typescript-eslint/no-empty-function": "off",
				"@typescript-eslint/ban-ts-ignore": "off",
			},
		},
		{
			files: ["*.js"],
			rules: {
				"@typescript-eslint/*": "off"
			}
		}
	],
};
