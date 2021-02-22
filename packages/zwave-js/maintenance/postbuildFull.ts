import { copyIndexFilesToRoot } from "./packageStructure";

process.on("unhandledRejection", (r) => {
	throw r;
});

void copyIndexFilesToRoot().then(() => process.exit(0));
