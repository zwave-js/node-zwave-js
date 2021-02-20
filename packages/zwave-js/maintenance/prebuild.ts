import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";

void Promise.all([generateCCAPIInterface(), generateCCExports()])
	.then(() => process.exit(0))
	.catch(() => process.exit(1));
