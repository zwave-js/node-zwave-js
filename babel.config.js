module.exports = {
	presets: [
		"@babel/preset-typescript",
		["@babel/preset-env", { targets: { node: "current" } }],
	],
	plugins: [
		["@babel/plugin-transform-typescript", { allowDeclareFields: true }],
		["@babel/plugin-proposal-decorators", { legacy: true }],
	],
};
