module.exports = {
	...require("../../ava.config.cjs"),
	// TODO: remove this when all jest tests are migrated
	files: ["**/*.test.ava.ts", "!build/**"],
};
