module.exports = {
	...require("../../ava.config.cjs"),
	files: ["src/**/*.test.ts"],
	// We're running .js files, so do not use the custom conditions that are used
	// to resolve to .ts exports
	nodeArguments: [],
};
