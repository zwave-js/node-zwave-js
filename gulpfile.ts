import { parallel, series, TaskFunction } from "gulp";
import { check as tscCheck, compile } from "./maintenance/compile";
// import { generateCCAPIInterface } from "./maintenance/generateCCAPIInterface";
// import { generateCCExports } from "./maintenance/generateCCExports";
// import { lintCCConstructors } from "./maintenance/lintCCConstructor";
// import { lintCCInterview } from "./maintenance/lintCCInterview";
// import { lintConfigFiles } from "./maintenance/lintConfigFiles";
import { clean, copyIndexFilesToRoot } from "./maintenance/packageStructure";

// const prebuild = series(
// 	parallel(lintCCInterview, lintCCConstructors),
// 	parallel(generateCCAPIInterface, generateCCExports),
// );
const prebuild = parallel(() => {
	console.log("default prebuild");
	return Promise.resolve();
});
const customBuild = (
	prebuildStep: TaskFunction | undefined,
	postbuildStep: TaskFunction | undefined,
): TaskFunction =>
	series(
		...[clean, prebuildStep, compile, postbuildStep].filter(
			(step): step is TaskFunction => !!step,
		),
	);
const customCheck = (prebuildStep: TaskFunction | undefined): TaskFunction =>
	series(
		...[prebuildStep, tscCheck].filter(
			(step): step is TaskFunction => !!step,
		),
	);

const check = customCheck(prebuild);
const build = customBuild(prebuild, copyIndexFilesToRoot);

export { clean, check, customCheck, prebuild, build, customBuild };
// lintConfigFiles,
// lintCCConstructors,
// lintCCInterview,
