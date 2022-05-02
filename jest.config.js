module.exports = {
	testEnvironment: "node",
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
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
	// Place snapshots next to test files
	snapshotResolver: "<rootDir>/test/jest.snapshotResolver.js",
};
