import { parallel, series } from "gulp";
import { compile } from "./maintenance/compile";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { lintConfigFiles } from "./maintenance/lintConfigFiles";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

const prebuild = parallel(generateCCAPIInterface, generateCCExports);
const postbuild = copyIndexFilesToRoot;
const build = series(clean, prebuild, compile, postbuild);

export { clean, prebuild, build, lintConfigFiles };
