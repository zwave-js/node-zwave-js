module.exports = {
	testEnvironment: "node",
	roots: [
		"<rootDir>/packages/config/src",
		"<rootDir>/packages/core/src",
		"<rootDir>/packages/serial/src",
		"<rootDir>/packages/shared/src",
		"<rootDir>/packages/zwave-js/src",
	],
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
	moduleNameMapper: {
		"^@zwave-js/config(.*)": "<rootDir>/packages/config/src$1",
		"^@zwave-js/core(.*)": "<rootDir>/packages/core/src$1",
		"^@zwave-js/serial(.*)": "<rootDir>/packages/serial/src$1",
		"^@zwave-js/shared(.*)": "<rootDir>/packages/shared/src$1",
	},
	setupFilesAfterEnv: ["jest-extended"],
	setupFiles: ["reflect-metadata"],
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
};
