/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/ban-types */
// Workaround for https://github.com/winstonjs/logform/pull/113
// Can be removed along with the tsconfig paths once the issue is fixed

export interface TransformableInfo {
	level: string;
	message: string;
	[key: string]: any;
}

export type TransformFunction = (
	info: TransformableInfo,
	opts?: any,
) => TransformableInfo | boolean;
export type Colors = { [key: string]: string | string[] }; // tslint:disable-line interface-over-type-literal
export type FormatWrap = (opts?: any) => Format;

export declare class Format {
	constructor(opts?: object);

	options?: object;
	transform: TransformFunction;
}

export declare class Colorizer extends Format {
	constructor(opts?: object);

	createColorize: (opts?: object) => Colorizer;
	addColors: (colors: Colors) => Colors;
	colorize: (level: string, message: string) => string;
}

export interface CliOptions extends ColorizeOptions, PadLevelsOptions {}

export interface ColorizeOptions {
	/**
	 * If set to `true` the color will be applied to the `level`.
	 */
	level?: boolean;
	/**
	 * If set to `true` the color will be applied to the `message` and `level`.
	 */
	all?: boolean;
	/**
	 * If set to `true` the color will be applied to the `message`.
	 */
	message?: boolean;
	/**
	 * An object containing the colors for the log levels. For example: `{ info: 'blue', error: 'red' }`.
	 */
	colors?: Record<string, string>;
}

export interface JsonOptions {
	/**
	 * A function that influences how the `info` is stringified.
	 */
	replacer?: (this: any, key: string, value: any) => any;
	/**
	 * The number of white space used to format the json.
	 */
	space?: number;
}

export interface LabelOptions {
	/**
	 * A label to be added before the message.
	 */
	label?: string;
	/**
	 * If set to `true` the `label` will be added to `info.message`. If set to `false` the `label`
	 * will be added as `info.label`.
	 */
	message?: boolean;
}

export interface MetadataOptions {
	/**
	 * The name of the key used for the metadata object. Defaults to `metadata`.
	 */
	key?: string;
	/**
	 * An array of keys that should not be added to the metadata object.
	 */
	fillExcept?: string[];
	/**
	 * An array of keys that will be added to the metadata object.
	 */
	fillWith?: string[];
}

export interface PadLevelsOptions {
	/**
	 * Log levels. Defaults to `configs.npm.levels` from [triple-beam](https://github.com/winstonjs/triple-beam)
	 * module.
	 */
	levels?: Record<string, number>;
}

export interface PrettyPrintOptions {
	/**
	 * A `number` that specifies the maximum depth of the `info` object being stringified by
	 * `util.inspect`. Defaults to `2`.
	 */
	depth?: number;
	/**
	 * Colorizes the message if set to `true`. Defaults to `false`.
	 */
	colorize?: boolean;
}

export interface TimestampOptions {
	/**
	 * Either the format as a string accepted by the [fecha](https://github.com/taylorhakes/fecha)
	 * module or a function that returns a formatted date. If no format is provided `new
	 * Date().toISOString()` will be used.
	 */
	format?: string | (() => string);
	/**
	 * The name of an alias for the timestamp property, that will be added to the `info` object.
	 */
	alias?: string;
}

export interface UncolorizeOptions {
	/**
	 * Disables the uncolorize format for `info.level` if set to `false`.
	 */
	level?: boolean;
	/**
	 * Disables the uncolorize format for `info.message` if set to `false`.
	 */
	message?: boolean;
	/**
	 * Disables the uncolorize format for `info[MESSAGE]` if set to `false`.
	 */
	raw?: boolean;
}

export const format = require("logform/format") as ((
	transform: TransformFunction,
) => FormatWrap) & {
	align(): Format;
	cli(opts?: CliOptions): Format;
	colorize(opts?: ColorizeOptions): Colorizer;
	combine(...formats: Format[]): Format;
	errors(opts?: object): Format;
	json(opts?: JsonOptions): Format;
	label(opts?: LabelOptions): Format;
	logstash(): Format;
	metadata(opts?: MetadataOptions): Format;
	ms(): Format;
	padLevels(opts?: PadLevelsOptions): Format;
	prettyPrint(opts?: PrettyPrintOptions): Format;
	printf(templateFunction: (info: TransformableInfo) => string): Format;
	simple(): Format;
	splat(): Format;
	timestamp(opts?: TimestampOptions): Format;
	uncolorize(opts?: UncolorizeOptions): Format;
};

export const levels = require("logform/levels") as (config: object) => object;

/*
 * @api private
 * method {function} exposeFormat
 * Exposes a sub-format on the main format object
 * as a lazy-loaded getter.
 */
function exposeFormat(name: string, requireFormat: () => any) {
	Object.defineProperty(format, name, {
		get() {
			return requireFormat();
		},
		configurable: true,
	});
}

//
// Setup all transports as lazy-loaded getters.
//
exposeFormat("align", function () {
	return require("logform/align");
});
exposeFormat("errors", function () {
	return require("logform/errors");
});
exposeFormat("cli", function () {
	return require("logform/cli");
});
exposeFormat("combine", function () {
	return require("logform/combine");
});
exposeFormat("colorize", function () {
	return require("logform/colorize");
});
exposeFormat("json", function () {
	return require("logform/json");
});
exposeFormat("label", function () {
	return require("logform/label");
});
exposeFormat("logstash", function () {
	return require("logform/logstash");
});
exposeFormat("metadata", function () {
	return require("logform/metadata");
});
exposeFormat("ms", function () {
	return require("logform/ms");
});
exposeFormat("padLevels", function () {
	return require("logform/pad-levels");
});
exposeFormat("prettyPrint", function () {
	return require("logform/pretty-print");
});
exposeFormat("printf", function () {
	return require("logform/printf");
});
exposeFormat("simple", function () {
	return require("logform/simple");
});
exposeFormat("splat", function () {
	return require("logform/splat");
});
exposeFormat("timestamp", function () {
	return require("logform/timestamp");
});
exposeFormat("uncolorize", function () {
	return require("logform/uncolorize");
});
