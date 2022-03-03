module.exports = {
	testEnvironment: "node",
	roots: [
		"<rootDir>/packages/config/src",
		"<rootDir>/packages/core/src",
		"<rootDir>/packages/nvmedit/src",
		"<rootDir>/packages/serial/src",
		"<rootDir>/packages/shared/src",
		"<rootDir>/packages/testing/src",
		"<rootDir>/packages/zwave-js/src",
	],
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	moduleNameMapper: {
		"^@zwave-js/(.*)/package.json": "<rootDir>/packages/$1/package.json",
		"^@zwave-js/config(.*)": "<rootDir>/packages/config/src$1",
		"^@zwave-js/core(.*)": "<rootDir>/packages/core/src$1",
		"^@zwave-js/nvmedit(.*)": "<rootDir>/packages/nvmedit/src$1",
		"^@zwave-js/maintenance(.*)": "<rootDir>/packages/maintenance/src$1",
		"^@zwave-js/serial(.*)": "<rootDir>/packages/serial/src$1",
		"^@zwave-js/shared(.*)": "<rootDir>/packages/shared/src$1",
		"^@zwave-js/testing(.*)": "<rootDir>/packages/testing/src$1",
	},
	globalSetup: "./test/jest.globalSetup.ts",
	setupFilesAfterEnv: ["jest-extended/all"],
	setupFiles: ["reflect-metadata", "./test/jest.setup.js"],
	extraGlobals: ["Reflect"],
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
