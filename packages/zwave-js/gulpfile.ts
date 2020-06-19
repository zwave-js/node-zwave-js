import { parallel, series } from "gulp";
import { compile } from "./maintenance/compile";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { lintCCConstructors } from "./maintenance/lintCCConstructor";
import { lintCCInterview } from "./maintenance/lintCCInterview";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

const prebuild = series(
	parallel(lintCCInterview, lintCCConstructors),
	parallel(generateCCAPIInterface, generateCCExports),
);

const build = series(clean, prebuild, compile, copyIndexFilesToRoot);

export { clean, prebuild, build, lintCCConstructors, lintCCInterview };
