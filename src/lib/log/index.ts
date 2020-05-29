// This may look weird, but by lazy-loading the logger instances, we avoid
// creating require-loops in modules that are referenced by the logger modules

interface LogIndex {
	serial: typeof import("./Serial");
	driver: typeof import("./Driver");
	controller: typeof import("./Controller");
	reflection: typeof import("./Reflection");
}
const logger = {} as LogIndex;
Object.defineProperties(logger, {
	serial: {
		get() {
			return require("./Serial");
		},
	},
	driver: {
		get() {
			return require("./Driver");
		},
	},
	controller: {
		get() {
			return require("./Controller");
		},
	},
	reflection: {
		get() {
			return require("./Reflection");
		},
	},
});

export default logger;
