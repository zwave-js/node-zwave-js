import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";
import { clean } from "./packageStructure";

process.on("unhandledRejection", (r) => {
	throw r;
});

void Promise.all([generateCCAPIInterface(), generateCCExports()])
	.then(clean)
	.then(() => process.exit(0));
