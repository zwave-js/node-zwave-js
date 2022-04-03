"use strict";

const { register } = require("esbuild-register/dist/node");

register({
	hookMatcher(f) {
		return f.endsWith(".ts");
	},
});
