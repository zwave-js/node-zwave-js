/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import gulp from "gulp";
import sourcemaps from "gulp-sourcemaps";
import ts from "gulp-typescript";

export function compile(settings?: ts.Settings) {
	const tsProject = ts.createProject("tsconfig.build.json", settings);
	return tsProject
		.src()
		.pipe(sourcemaps.init())
		.pipe(tsProject())
		.pipe(
			sourcemaps.write(".", {
				includeContent: false,
				sourceRoot: "../src",
			}),
		)
		.pipe(gulp.dest(tsProject.options.outDir!));
}

export function check() {
	return compile({ composite: false, noEmit: true });
}
