import { lintCCConstructors } from "./lintCCConstructor";
import { lintCCInterview } from "./lintCCInterview";

void Promise.all([lintCCConstructors(), lintCCInterview()])
	.then(() => process.exit(0))
	.catch(() => process.exit(1));
