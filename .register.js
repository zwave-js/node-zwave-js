require("esbuild-register/dist/node").register({
	extensions: [".ts"],
	sourcemap: false,
	target: `node${process.version.slice(1)}`,
});
