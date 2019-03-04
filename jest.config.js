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
		"./test/jest.setup.js"
	],
	collectCoverage: true,
	coverageReporters: [
		"lcov", "html"
	]
}