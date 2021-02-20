import { lintCCConstructors } from "./lintCCConstructor";
import { lintCCInterview } from "./lintCCInterview";

process.on("unhandledRejection", (r) => {
	throw r;
});

void Promise.all([lintCCConstructors(), lintCCInterview()]).then(() =>
	process.exit(0),
);
