import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";
import { clean } from "./packageStructure";

void Promise.all([generateCCAPIInterface(), generateCCExports()])
	.then(clean)
	.then(() => process.exit(0))
	.catch(() => process.exit(1));
