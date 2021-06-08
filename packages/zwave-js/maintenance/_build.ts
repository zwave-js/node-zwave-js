import { red } from "ansi-colors";
import { generateCCAPIInterface } from "./generateCCAPIInterface";
import { generateCCExports } from "./generateCCExports";
import { lintCCConstructors } from "./lintCCConstructor";
import { lintCCInterview } from "./lintCCInterview";
import { clean, copyIndexFilesToRoot } from "./packageStructure";

const argv = process.argv.slice(2);

const lint = () => Promise.all([lintCCInterview(), lintCCConstructors()]);
const prebuild = () =>
	Promise.all([generateCCAPIInterface(), generateCCExports()]);

(async () => {
	if (argv.includes("lint")) {
		await lint();
	}

	if (argv.includes("prebuild")) {
		await prebuild();
	}

	// The full build task is used to create a "full build" - removing old build artifacts and ensuring the correct directory structure
	// For a quick test build, use the "tsc" way - until we can model the entire build process with esbuild/estrella
	if (argv.includes("prebuild:full")) {
		await clean();
		await prebuild();
	} else if (argv.includes("postbuild:full")) {
		await copyIndexFilesToRoot();
	}
})().catch((e) => {
	console.error(red(e.message));
	console.error(" ");
	process.exit(1);
});
