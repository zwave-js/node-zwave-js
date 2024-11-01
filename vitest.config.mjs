import { defaultExclude, defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: [
			...defaultExclude,
			"build/**",
			".vscode/extensions/**",
			// Transformer tests require dependencies to be compiled
			// and cannot use the @@dev condition..
			"packages/transformers/**",
		],
	},
	resolve: {
		conditions: ["@@dev"],
	},
});
