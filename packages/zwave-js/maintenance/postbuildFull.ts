import { copyIndexFilesToRoot } from "./packageStructure";

copyIndexFilesToRoot()
	.then(() => process.exit(0))
	.catch(() => process.exit(1));
