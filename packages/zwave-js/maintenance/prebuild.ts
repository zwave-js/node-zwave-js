import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";

process.on("unhandledRejection", (r) => {
	throw r;
});

void Promise.all([generateCCAPIInterface(), generateCCExports()]).then(() =>
	process.exit(0),
);
