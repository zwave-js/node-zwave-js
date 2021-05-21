import { getEnumMemberName } from "@zwave-js/shared";
import type { Duration } from "./Duration";
import { IntegerLimits } from "./Primitive";

const isIntegerRegex = /^\d+$/;

/** Returns an array with the values of a numeric enum */
export function getNumericEnumValues<T extends Record<string, any>>(
	enumeration: T,
): readonly number[] {
	return Object.keys(enumeration)
		.filter((val) => isIntegerRegex.test(val))
		.map((val) => parseInt(val, 10));
}

/** Takes an enumeration and an array of values of this enumeration and returns a states record to be used as metadata */
export function enumValuesToMetadataStates<T extends Record<string, any>>(
	enumeration: T,
	values?: readonly number[],
): Record<number, string> {
	const ret: Record<number, string> = {};
	if (values == undefined) values = getNumericEnumValues(enumeration);
	for (const value of values) {
		ret[value] = getEnumMemberName(enumeration, value);
	}
	return ret;
}

export type ValueType =
	| "number"
	| "boolean"
	| "string"
	| "number[]"
	| "boolean[]"
	| "string[]"
	| "duration"
	| "color"
	| "buffer"
	| "any";

export interface ValueMetadataAny {
	/** The type of the value */
	type: ValueType;
	/** The default value */
	default?: any;
	/** Whether the value can be read. By default all values are assumed readable */
	readable: boolean;
	/** Whether the value can be written. By default all values are assumed writeable */
	writeable: boolean;
	/** A description of the value */
	description?: string;
	/** A human-readable name for the property */
	label?: string;
	/** CC-specific information to help identify this value */
	ccSpecific?: Record<string, any>;
}

export interface ValueMetadataNumeric extends ValueMetadataAny {
	type: "number";
	/** The minimum value that can be assigned to a CC value (optional) */
	min?: number;
	/** The maximum value that can be assigned to a CC value (optional) */
	max?: number;
	/** When only certain values between min and max are allowed, this determines the step size */
	steps?: number;
	/** The default value */
	default?: number;
	/** Speaking names for numeric values */
	states?: Record<number, string>;
	/** An optional unit for numeric values */
	unit?: string;
}

export interface ValueMetadataBoolean extends ValueMetadataAny {
	type: "boolean";
	/** The default value */
	default?: number;
}

export interface ValueMetadataString extends ValueMetadataAny {
	type: "string" | "color";
	/** The minimum length this string must have (optional) */
	minLength?: number;
	/** The maximum length this string may have (optional) */
	maxLength?: number;
	/** The default value */
	default?: string;
}

export interface ValueMetadataBuffer extends ValueMetadataAny {
	type: "buffer";
	/** The minimum length this buffer must have (optional) */
	minLength?: number;
	/** The maximum length this buffer may have (optional) */
	maxLength?: number;
}

export interface ValueMetadataDuration extends ValueMetadataAny {
	type: "duration";
	default?: Duration;
}

export enum ConfigValueFormat {
	SignedInteger = 0x00,
	UnsignedInteger = 0x01,
	Enumerated = 0x02, // UnsignedInt, Radio Buttons
	BitField = 0x03, // Check Boxes
}

/**
 * @publicAPI
 * A configuration value is either a single number or a bit map
 */
export type ConfigValue = number | Set<number>;

export interface ConfigurationMetadata extends ValueMetadataAny {
	// readable and writeable are inherited from ValueMetadataAny
	min?: ConfigValue;
	max?: ConfigValue;
	default?: ConfigValue;
	unit?: string;
	valueSize?: number;
	format?: ConfigValueFormat;
	name?: string;
	info?: string;
	noBulkSupport?: boolean;
	isAdvanced?: boolean;
	requiresReInclusion?: boolean;
	// The following information cannot be detected by scanning.
	// We have to rely on configuration to support them
	// options?: readonly ConfigOption[];
	states?: Record<number, string>;
	allowManualEntry?: boolean;
	isFromConfig?: boolean;
}

export type ValueMetadata =
	| ValueMetadataAny
	| ValueMetadataNumeric
	| ValueMetadataBoolean
	| ValueMetadataString
	| ValueMetadataDuration
	| ValueMetadataBuffer
	| ConfigurationMetadata;

// TODO: lists of allowed values, etc...

// Mixins for value metadata
const _default: ValueMetadataAny = {
	type: "any",
	readable: true,
	writeable: true,
};

const _readonly = {
	writeable: false,
};

const _writeonly = {
	readable: false,
};

/** The default value for metadata: readable and writeable */
const Any: ValueMetadataAny = {
	..._default,
};

/** The default value for readonly metadata */
const ReadOnly: ValueMetadataAny = {
	..._default,
	..._readonly,
};

/** The default value for writeonly metadata */
const WriteOnly: ValueMetadataAny = {
	..._default,
	..._writeonly,
};

/** A boolean value */
const Boolean: ValueMetadataBoolean = {
	..._default,
	type: "boolean",
};

/** A boolean value (readonly) */
const ReadOnlyBoolean: ValueMetadataBoolean = {
	...Boolean,
	..._readonly,
};

/** A boolean value (writeonly) */
const WriteOnlyBoolean: ValueMetadataBoolean = {
	...Boolean,
	..._writeonly,
};

/** Any number */
const Number: ValueMetadataNumeric = {
	..._default,
	type: "number",
};

/** Unsigned number (readonly) */
const ReadOnlyNumber: ValueMetadataNumeric = {
	...Number,
	..._readonly,
};

/** Unsigned number (writeonly) */
const WriteOnlyNumber: ValueMetadataNumeric = {
	...Number,
	..._writeonly,
};

/** Unsigned 8-bit integer */
const UInt8: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.UInt8,
};

/** Unsigned 8-bit integer (readonly) */
const ReadOnlyUInt8: ValueMetadataNumeric = {
	...UInt8,
	..._readonly,
};

/** Unsigned 8-bit integer (writeonly) */
const WriteOnlyUInt8: ValueMetadataNumeric = {
	...UInt8,
	..._writeonly,
};

/** Unsigned 16-bit integer */
const UInt16: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.UInt16,
};

/** Unsigned 16-bit integer (readonly) */
const ReadOnlyUInt16: ValueMetadataNumeric = {
	...UInt16,
	..._readonly,
};

/** Unsigned 16-bit integer (writeonly) */
const WriteOnlyUInt16: ValueMetadataNumeric = {
	...UInt16,
	..._writeonly,
};

/** Unsigned 24-bit integer */
const UInt24: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.UInt24,
};

/** Unsigned 24-bit integer (readonly) */
const ReadOnlyUInt24: ValueMetadataNumeric = {
	...UInt24,
	..._readonly,
};

/** Unsigned 24-bit integer (writeonly) */
const WriteOnlyUInt24: ValueMetadataNumeric = {
	...UInt24,
	..._writeonly,
};

/** Unsigned 32-bit integer */
const UInt32: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.UInt32,
};

/** Unsigned 32-bit integer (readonly) */
const ReadOnlyUInt32: ValueMetadataNumeric = {
	...UInt32,
	..._readonly,
};

/** Unsigned 32-bit integer (writeonly) */
const WriteOnlyUInt32: ValueMetadataNumeric = {
	...UInt32,
	..._writeonly,
};

/** Signed 8-bit integer */
const Int8: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.Int8,
};

/** Signed 8-bit integer (readonly) */
const ReadOnlyInt8: ValueMetadataNumeric = {
	...Int8,
	..._readonly,
};

/** Signed 8-bit integer (writeonly) */
const WriteOnlyInt8: ValueMetadataNumeric = {
	...Int8,
	..._writeonly,
};

/** Signed 16-bit integer */
const Int16: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.Int16,
};

/** Signed 16-bit integer (readonly) */
const ReadOnlyInt16: ValueMetadataNumeric = {
	...Int16,
	..._readonly,
};

/** Signed 16-bit integer (writeonly) */
const WriteOnlyInt16: ValueMetadataNumeric = {
	...Int16,
	..._writeonly,
};

/** Signed 24-bit integer */
const Int24: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.Int24,
};

/** Signed 24-bit integer (readonly) */
const ReadOnlyInt24: ValueMetadataNumeric = {
	...Int24,
	..._readonly,
};

/** Signed 24-bit integer (writeonly) */
const WriteOnlyInt24: ValueMetadataNumeric = {
	...Int24,
	..._writeonly,
};

/** Signed 32-bit integer */
const Int32: ValueMetadataNumeric = {
	..._default,
	type: "number",
	...IntegerLimits.Int32,
};

/** Signed 32-bit integer (readonly) */
const ReadOnlyInt32: ValueMetadataNumeric = {
	...Int32,
	..._readonly,
};

/** Signed 32-bit integer (writeonly) */
const WriteOnlyInt32: ValueMetadataNumeric = {
	...Int32,
	..._writeonly,
};

/** Any string */
const String: ValueMetadataString = {
	..._default,
	type: "string",
};

/** Any string (readonly) */
const ReadOnlyString: ValueMetadataString = {
	...String,
	..._readonly,
};

/** Any string (writeonly) */
const WriteOnlyString: ValueMetadataString = {
	...String,
	..._writeonly,
};

/** A (hex) string that represents a color */
const Color: ValueMetadataString = {
	...String,
	type: "color",
};

/** A (hex) string that represents a color (readonly) */
const ReadOnlyColor: ValueMetadataString = {
	...Color,
	..._readonly,
};

/** A (hex) string that represents a color (writeonly) */
const WriteOnlyColor: ValueMetadataString = {
	...Color,
	..._writeonly,
};

// Some predefined CC-specific metadata

/** The level of a Switch */
const Level: ValueMetadataNumeric = {
	...UInt8,
	max: 99,
};

/** The level of a Switch (readonly) */
const ReadOnlyLevel: ValueMetadataNumeric = {
	...Level,
	..._readonly,
};

/** The level of a Switch (writeonly) */
const WriteOnlyLevel: ValueMetadataNumeric = {
	...Level,
	..._writeonly,
};

/** A duration value */
const _Duration: ValueMetadataDuration = {
	..._default,
	type: "duration",
};

/** A duration value (readonly) */
const ReadOnlyDuration: ValueMetadataDuration = {
	..._Duration,
	..._readonly,
};

/** A duration value (writeonly) */
const WriteOnlyDuration: ValueMetadataDuration = {
	..._Duration,
	..._writeonly,
};

/** A buffer */
const _Buffer: ValueMetadataBuffer = {
	..._default,
	type: "buffer",
};

/** A buffer (readonly) */
const ReadOnlyBuffer: ValueMetadataBuffer = {
	..._Buffer,
	..._readonly,
};

/** A buffer (writeonly) */
const WriteOnlyBuffer: ValueMetadataBuffer = {
	..._Buffer,
	..._writeonly,
};

/** A collection of predefined CC value metadata */
export const ValueMetadata = {
	/** The default value for metadata: readable and writeable */
	Any: Object.freeze(Any),
	/** The default value for readonly metadata */
	ReadOnly: Object.freeze(ReadOnly),
	/** The default value for writeonly metadata */
	WriteOnly: Object.freeze(WriteOnly),

	/** A numeric value */
	Number: Object.freeze(Number),
	/** A numeric value (readonly) */
	ReadOnlyNumber: Object.freeze(ReadOnlyNumber),
	/** A numeric value (writeonly) */
	WriteOnlyNumber: Object.freeze(WriteOnlyNumber),

	/** Unsigned 8-bit integer */
	UInt8: Object.freeze(UInt8),
	/** Unsigned 16-bit integer */
	UInt16: Object.freeze(UInt16),
	/** Unsigned 24-bit integer */
	UInt24: Object.freeze(UInt24),
	/** Unsigned 32-bit integer */
	UInt32: Object.freeze(UInt32),
	/** Signed 8-bit integer */
	Int8: Object.freeze(Int8),
	/** Signed 16-bit integer */
	Int16: Object.freeze(Int16),
	/** Signed 24-bit integer */
	Int24: Object.freeze(Int24),
	/** Signed 32-bit integer */
	Int32: Object.freeze(Int32),

	/** Unsigned 8-bit integer (readonly) */
	ReadOnlyUInt8: Object.freeze(ReadOnlyUInt8),
	/** Unsigned 16-bit integer (readonly) */
	ReadOnlyUInt16: Object.freeze(ReadOnlyUInt16),
	/** Unsigned 24-bit integer (readonly) */
	ReadOnlyUInt24: Object.freeze(ReadOnlyUInt24),
	/** Unsigned 32-bit integer (readonly) */
	ReadOnlyUInt32: Object.freeze(ReadOnlyUInt32),
	/** Signed 8-bit integer (readonly) */
	ReadOnlyInt8: Object.freeze(ReadOnlyInt8),
	/** Signed 16-bit integer (readonly) */
	ReadOnlyInt16: Object.freeze(ReadOnlyInt16),
	/** Signed 24-bit integer (readonly) */
	ReadOnlyInt24: Object.freeze(ReadOnlyInt24),
	/** Signed 32-bit integer (readonly) */
	ReadOnlyInt32: Object.freeze(ReadOnlyInt32),

	/** Unsigned 8-bit integer (writeonly) */
	WriteOnlyUInt8: Object.freeze(WriteOnlyUInt8),
	/** Unsigned 16-bit integer (writeonly) */
	WriteOnlyUInt16: Object.freeze(WriteOnlyUInt16),
	/** Unsigned 24-bit integer (writeonly) */
	WriteOnlyUInt24: Object.freeze(WriteOnlyUInt24),
	/** Unsigned 32-bit integer (writeonly) */
	WriteOnlyUInt32: Object.freeze(WriteOnlyUInt32),
	/** Signed 8-bit integer (writeonly) */
	WriteOnlyInt8: Object.freeze(WriteOnlyInt8),
	/** Signed 16-bit integer (writeonly) */
	WriteOnlyInt16: Object.freeze(WriteOnlyInt16),
	/** Signed 24-bit integer (writeonly) */
	WriteOnlyInt24: Object.freeze(WriteOnlyInt24),
	/** Signed 32-bit integer (writeonly) */
	WriteOnlyInt32: Object.freeze(WriteOnlyInt32),

	/** The level of a Switch (0-99) */
	Level: Object.freeze(Level),
	/** The level of a Switch (0-99, readonly) */
	ReadOnlyLevel: Object.freeze(ReadOnlyLevel),
	/** The level of a Switch (0-99, writeonly) */
	WriteOnlyLevel: Object.freeze(WriteOnlyLevel),

	/** A boolean value */
	Boolean: Object.freeze(Boolean),
	/** A boolean value (readonly) */
	ReadOnlyBoolean: Object.freeze(ReadOnlyBoolean),
	/** A boolean value (writeonly) */
	WriteOnlyBoolean: Object.freeze(WriteOnlyBoolean),

	/** A string */
	String: Object.freeze(String),
	/** A string (readonly) */
	ReadOnlyString: Object.freeze(ReadOnlyString),
	/** A string (writeonly) */
	WriteOnlyString: Object.freeze(WriteOnlyString),

	/** A (hex) string that represents a color */
	Color: Object.freeze(Color),
	/** A (hex) string that represents a color (readonly) */
	ReadOnlyColor: Object.freeze(ReadOnlyColor),
	/** A (hex) string that represents a color (writeonly) */
	WriteOnlyColor: Object.freeze(WriteOnlyColor),

	/** A duration value */
	Duration: Object.freeze(_Duration),
	/** A duration value (readonly) */
	ReadOnlyDuration: Object.freeze(ReadOnlyDuration),
	/** A duration value (writeonly) */
	WriteOnlyDuration: Object.freeze(WriteOnlyDuration),

	/** A buffer */
	Buffer: Object.freeze(_Buffer),
	/** A buffer (readonly) */
	ReadOnlyBuffer: Object.freeze(ReadOnlyBuffer),
	/** A buffer (writeonly) */
	WriteOnlyBuffer: Object.freeze(WriteOnlyBuffer),
};
