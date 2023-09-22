import { red } from "ansi-colors";
import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";
import { generateCCValuesInterface } from "./generateCCValuesInterface";
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
	console.error(red(e.message));
	console.error(" ");
	process.exit(1);
});
