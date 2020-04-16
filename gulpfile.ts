import { parallel, series } from "gulp";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

export { lintConfigFiles } from "./maintenance/lintConfigFiles";
export {
	generateCCAPIInterface,
	generateCCExports,
	clean,
	copyIndexFilesToRoot,
};

export const prebuild = series(
	clean,
	parallel(generateCCAPIInterface, generateCCExports),
);
export const postbuild = copyIndexFilesToRoot;
// export const postpack = restorePackageStructure;
