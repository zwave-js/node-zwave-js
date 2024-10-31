const path = require("path");
module.exports = {
	extensions: ["ts"],
	files: ["test/**", "**/*.test.ts", "!build/**"],
	nodeArguments: [
		"--import",
		"tsx",
		"--conditions=@@dev",
	],
};
