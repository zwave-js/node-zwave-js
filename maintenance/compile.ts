import gulp from "gulp";
import ts from "gulp-typescript";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function compile(settings?: ts.Settings) {
	const tsProject = ts.createProject("tsconfig.build.json", settings);
	return tsProject
		.src()
		.pipe(tsProject())
		.pipe(gulp.dest(tsProject.options.outDir!));
}
