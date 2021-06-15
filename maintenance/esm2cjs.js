// @ts-check

const glob = require("tiny-glob");
const { build } = require("esbuild");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const path = require("path");
const fs = require("fs-extra");

const argv = yargs(hideBin(process.argv))
	.string(["in", "out"])
	.demandOption(["in", "out"]).argv;

(async () => {
	const inDir = path.join(process.cwd(), argv.in);
	const outDir = path.join(process.cwd(), argv.out);
	await fs.emptyDir(outDir);

	// Compile CJS
	const entryPoints = await glob("**/*.js", { cwd: inDir });
	await build({
		absWorkingDir: inDir,
		entryPoints,
		outdir: outDir,
		bundle: false,
		minify: false,
		sourcemap: true,
		logLevel: "info",
		platform: "node",
		format: "cjs",
		target: "node10",
	});

	// Define the module type of each build directory separately
	await fs.writeJSON(
		path.join(inDir, "package.json"),
		{ type: "module" },
		{
			spaces: 4,
		},
	);
	await fs.writeJSON(
		path.join(outDir, "package.json"),
		{ type: "commonjs" },
		{
			spaces: 4,
		},
	);
})().catch((e) => {
	console.error(e);
	process.exit(1);
});
