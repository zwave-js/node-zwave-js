import { parallel, series } from "gulp";
import { compile } from "./maintenance/compile";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { lintCCConstructors } from "./maintenance/lintCCConstructor";
import { lintCCInterview } from "./maintenance/lintCCInterview";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

const lint = parallel(lintCCInterview, lintCCConstructors);
const prebuild = parallel(generateCCAPIInterface, generateCCExports);

// The gulp build task is used to create a "full build" - removing old build artifacts and ensuring the correct directory structure
// For a quick test build, use the "tsc" way - until https://github.com/ivogabe/gulp-typescript/issues/611 is fixed
const build = series(clean, prebuild, compile, copyIndexFilesToRoot);

export { clean, prebuild, build, lintCCConstructors, lintCCInterview, lint };
