module.exports = {
	testEnvironment: "node",
	"roots": [
		"<rootDir>/src"
	],
	"transform": {
		"^.+\\.tsx?$": "ts-jest"
	},
	"testRegex": "(\\.|/)test\\.tsx?$",
	"moduleFileExtensions": [
		"ts",
		"tsx",
		"js",
		"jsx",
		"json",
		"node"
	],
	"setupFilesAfterEnv": [
		"jest-extended"
	],
	"setupFiles": [
		"reflect-metadata"
	],
	collectCoverage: false,
	collectCoverageFrom: [
		"src/**/*.ts",
		"!src/**/*.test.ts"
	],
	coverageReporters: [
		"lcov", "html", "text-summary"
	]
}