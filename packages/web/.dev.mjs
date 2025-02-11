import esbuild from "esbuild";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";

// Create a context for incremental builds
const context = await esbuild.context({
	entryPoints: ["src/flasher.ts"],
	bundle: true,
	sourcemap: true,
	//   analyze: "verbose",
	outdir: "build",
	target: "es2022",
	format: "esm",
	platform: "browser",
	external: [
		"@zwave-js/serial/bindings/node",
		"@zwave-js/core/bindings/fs/node",
		"@zwave-js/core/bindings/db/jsonl",
		"@zwave-js/core/bindings/log/node",
		"node:crypto",
		// "source-map-support",
	],
	// logLevel: "verbose",
	logLevel: "info",
	logLimit: 0,
	keepNames: true,
	plugins: [
		nodeModulesPolyfillPlugin({
			// fallback: "error",
			modules: {
				// Required for source-map-support
				path: true,
				// FIXME: Required for zwave-js internally
				module: true,
				url: true,
				// Required for mdns
				dgram: "empty",
				os: "empty",
				events: "empty",
				buffer: "empty",
			},
		}),
	],
});

// Enable watch mode
await context.watch();

// Enable serve mode
await context.serve({
	servedir: ".",
});
