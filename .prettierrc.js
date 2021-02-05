module.exports = {
	semi: true,
	trailingComma: "all",
	singleQuote: false,
	printWidth: 80,
	useTabs: true,
	tabWidth: 4,
	endOfLine: "lf",

	overrides: [
		{
			files: "packages/config/**/*.json",
			options: {
				printWidth: 120,
			},
		},
		{
			files: "*.yml",
			options: {
				useTabs: false,
				tabWidth: 2,
				singleQuote: true,
			},
		},
	],
};
