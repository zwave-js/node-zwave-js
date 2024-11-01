import { defineConfig } from "vitest/config";

export default defineConfig({
	exclude: [".vscode/extensions/**"],
	resolve: {
		conditions: ["@@dev"],
	},
});
