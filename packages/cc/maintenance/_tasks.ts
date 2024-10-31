import c from "ansi-colors";
import { generateCCAPIInterface } from "./generateCCAPIInterface.js";
import { generateCCExports } from "./generateCCExports.js";
import { generateCCValuesInterface } from "./generateCCValuesInterface.js";
// import { lintCCConstructors } from "./lintCCConstructor";

const argv = process.argv.slice(2);

const codegen = () =>
	Promise.all([
		generateCCAPIInterface(),
		generateCCValuesInterface(),
		generateCCExports(),
	]);

(async () => {
	if (argv.includes("codegen")) {
		await codegen();
	}
})().catch((e) => {
	console.error(c.red(e.stack));
	console.error(" ");
	process.exit(1);
});
