module.exports = {
	presets: [
		"@babel/preset-typescript",
		["@babel/preset-env", { targets: { node: "current" } }],
	],
	plugins: [
		["@babel/plugin-transform-typescript", { allowDeclareFields: true }],
		["@babel/plugin-proposal-decorators", { legacy: true }],
		["@babel/plugin-proposal-class-properties", { loose: true }],
		["@babel/plugin-proposal-private-methods", { loose: true }],
		["@babel/plugin-proposal-private-property-in-object", { loose: true }],
	],
};
