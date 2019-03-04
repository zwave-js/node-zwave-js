module.exports = {
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
	collectCoverage: true,
	coverageReporters: [
		"lcov", "html"
	]
}