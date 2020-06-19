module.exports = {
	testEnvironment: "node",
	roots: [
		"<rootDir>/packages/config/src",
		"<rootDir>/packages/core/src",
		"<rootDir>/packages/shared/src",
		"<rootDir>/packages/zwave-js/src",
	],
	testRegex: "(\\.|/)test\\.tsx?$",
	moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
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
