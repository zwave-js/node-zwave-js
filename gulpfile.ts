import { parallel } from "gulp";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { copyIndexFilesToRoot } from "./maintenance/packageStructure";

export { lintConfigFiles } from "./maintenance/lintConfigFiles";
export { clean } from "./maintenance/packageStructure";
export { generateCCAPIInterface, generateCCExports };
export { copyIndexFilesToRoot /*, restorePackageStructure*/ };

export const prebuild = parallel(generateCCAPIInterface, generateCCExports);
export const postbuild = copyIndexFilesToRoot;
// export const postpack = restorePackageStructure;
