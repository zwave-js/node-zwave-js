import { parallel } from "gulp";
import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
import { generateCCExports } from "./maintenance/generateCCExports";
import {
	preparePackageStructure,
	restorePackageStructure,
} from "./maintenance/packageStructure";

export { lintConfigFiles } from "./maintenance/lintConfigFiles";
export { generateCCAPIInterface, generateCCExports };
export { preparePackageStructure, restorePackageStructure };

export const prebuild = parallel(generateCCAPIInterface, generateCCExports);
export const prepack = preparePackageStructure;
export const postpack = restorePackageStructure;
