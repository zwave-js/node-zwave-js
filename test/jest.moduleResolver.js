module.exports = (path, options) => {
	// Call the defaultResolver, so we leverage its cache, error handling, etc.
	return options.defaultResolver(path, {
		...options,
		// Use packageFilter to process parsed `package.json` before the resolution (see https://www.npmjs.com/package/resolve#resolveid-opts-cb)
		packageFilter: (pkg) => {
			if (!pkg.publishConfig) return pkg;

			// Use the publishConfig entries for these fields when present
			// We point them at the compiled files, which is what jest needs
			for (const prop of [
				"main",
				"module",
				"exports",
				"types",
				"typesVersions",
			]) {
				if (pkg.publishConfig[prop]) {
					pkg[prop] = pkg.publishConfig[prop];
				}
			}
			return pkg;
		},
	});
};
