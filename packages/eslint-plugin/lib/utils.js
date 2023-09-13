const path = require("node:path");

const repoRoot = path.normalize(
	__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)),
);

module.exports = {
	repoRoot,
};
