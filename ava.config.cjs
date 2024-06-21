const path = require("path");
module.exports = {
	extensions: ["ts"],
	files: ["test/**", "**/*.test.ts", "!build/**"],
	require: [path.join(__dirname, "./maintenance/esbuild-register.js")],
	nodeArguments: [
		"--conditions=@@dev",
	],
};
