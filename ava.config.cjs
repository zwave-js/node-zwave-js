module.exports = {
	extensions: ["ts"],
	files: ["test/**", "**/*.test.ts", "!build/**"],
	require: ["esbuild-register"],
};
