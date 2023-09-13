import path from "node:path";

export const repoRoot = path.normalize(
	__dirname.slice(0, __dirname.lastIndexOf(`${path.sep}packages${path.sep}`)),
);
