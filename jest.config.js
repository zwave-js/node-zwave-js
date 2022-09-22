module.exports = {
	testEnvironment: "node",
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	modulePathIgnorePatterns: [
		// TODO: Add those packages that have been migrated to ava
		"<rootDir>/packages/shared",
		"<rootDir>/packages/core",
		"<rootDir>/packages/nvmedit",
		"<rootDir>/packages/transformers",
	],
	moduleNameMapper: {
		// Somehow the testing module isn't found automatically 🤷‍♂️
		"^@zwave-js/testing(.*)": "<rootDir>/packages/testing/src$1",
	},
	globalSetup: "./test/jest.globalSetup.ts",
	setupFilesAfterEnv: ["jest-extended/all"],
	setupFiles: ["reflect-metadata", "./test/jest.setup.js"],
	sandboxInjectedGlobals: ["Reflect"],
	collectCoverage: false,
	collectCoverageFrom: [
		"packages/**/src/**/*.ts",
		"!packages/**/src/**/*.test.ts",
	],
	coverageReporters: ["lcov", "html", "text-summary"],
	transform: {
		"^.+\\.tsx?$": "babel-jest",
	},
	// Help jest resolve the compiled files which are referenced inside publishConfig
	resolver: "./test/jest.moduleResolver.js",
};
