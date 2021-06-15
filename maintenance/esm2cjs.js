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
	let entryPoints = await glob(path.join(argv.in, "**/*.ts"));
	const dts = entryPoints.filter((ep) => ep.endsWith(".d.ts"));
	const dtsMap = await glob(path.join(argv.in, "**/*.d.ts.map"));
	entryPoints = entryPoints.filter((ep) => !ep.endsWith(".d.ts"));
	// Compile CJS
	await build({
		entryPoints,
		outdir: argv.out,
		bundle: false,
		minify: false,
		sourcemap: true,
		logLevel: "info",
		platform: "node",
		format: "cjs",
		target: "node10",
	});
	// Copy declarations over
	for (const file of [...dts, ...dtsMap]) {
		await fs.copy(file, path.join(argv.out, path.relative(argv.in, file)));
	}
})().catch(() => process.exit(1));
