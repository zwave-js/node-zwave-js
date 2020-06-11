import { parallel, series } from "gulp";
import { check as tscCheck, compile } from "./maintenance/compile";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { lintCCConstructors } from "./maintenance/lintCCConstructor";
import { lintCCInterview } from "./maintenance/lintCCInterview";
import { lintConfigFiles } from "./maintenance/lintConfigFiles";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

const prebuild = series(
	lintCCInterview,
	lintCCConstructors,
	parallel(generateCCAPIInterface, generateCCExports),
);
const postbuild = copyIndexFilesToRoot;
const build = series(clean, prebuild, compile, postbuild);
const check = series(prebuild, tscCheck);

export {
	clean,
	check,
	prebuild,
	build,
	lintConfigFiles,
	lintCCConstructors,
	lintCCInterview,
};
