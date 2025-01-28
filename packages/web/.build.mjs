import esbuild from "esbuild";
import { nodeModulesPolyfillPlugin } from "esbuild-plugins-node-modules-polyfill";

const imports = new Map();

let logImportsPlugin = {
	name: "logImports",
	setup(build) {
		build.onResolve({ filter: /.*/ }, (args) => {
			if (args.path.startsWith(".")) {
				return;
			}
			const list = imports.get(args.path) || [];
			list.push([args.importer, args.kind]);
			imports.set(args.path, list);
		});
	},
};

// Create a context for incremental builds
try {
	await esbuild.build({
		entryPoints: ["src/test.ts"],
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
			"node:crypto",
		],
		// logLevel: "verbose",
		logLevel: "info",
		logLimit: 0,
		plugins: [
			logImportsPlugin,
			nodeModulesPolyfillPlugin({
				// fallback: "error",
				modules: {
					path: true,
					util: true,
					module: true,
					// NOPE:
					dgram: "empty",
					os: "empty",
					buffer: "empty",
					events: "empty",
				},
			}),
		],
	});
} catch (e) {
	//   for (const [module, infos] of imports) {
	//     console.error(`Module ${module} is imported by:`);
	//     for (const [importer, kind] of infos) {
	//       console.error(`  ${importer} via ${kind}`);
	//     }
	//   }
	throw e;
}
