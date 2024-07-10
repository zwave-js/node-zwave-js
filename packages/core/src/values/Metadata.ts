import { getEnumMemberName } from "@zwave-js/shared/safe";
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

/**
 * Defines options that can be provided when changing a value on a device via its value ID.
 * Each implementation will choose the options that are relevant for it, so the same options can be used everywhere.
 */
export interface ValueChangeOptions {
	/** A duration to be used for transitions like dimming lights or activating scenes. */
	transitionDuration: Duration | string;
	/** A volume level to be used for activating a Sound Switch CC. */
	volume: number;
}

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
	/** Options that can be provided when changing this value on a device via its value ID. */
	valueChangeOptions?: readonly (keyof ValueChangeOptions)[];
	/** Whether this value represents a state (`true`) or a notification/event (`false`) */
	stateful?: boolean;
	/** Omit this value from value logs */
	secret?: boolean;
}

/**
 * Helper function to define metadata templates while checking that they satisfy a constraint.
 */
// TODO: Revisit this when https://github.com/microsoft/TypeScript/issues/47920 is solved
const define = <TBase extends ValueMetadataAny>() =>
// The chained function pattern is necessary for partial application of generic types
<T extends TBase>(definition: T): T => {
	return definition;
};

const defineAny = define<ValueMetadataAny>();

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
	/**
	 * Whether a user should be able to manually enter all legal values in the range `min...max` (`true`),
	 * or if only the ones defined in `states` should be selectable in a dropdown (`false`).
	 *
	 * If missing, applications should assume this to be `true` if no `states` are defined and `false` if `states` are defined.
	 */
	allowManualEntry?: boolean;
	/** An optional unit for numeric values */
	unit?: string;
}

const defineNumeric = define<ValueMetadataNumeric>();

export interface ValueMetadataBoolean extends ValueMetadataAny {
	type: "boolean";
	/** The default value */
	default?: number;
	/** Possible values and their meaning */
	states?: {
		true?: string;
		false?: string;
	};
}

const defineBoolean = define<ValueMetadataBoolean>();

export interface ValueMetadataString extends ValueMetadataAny {
	type: "string" | "color";
	/** The minimum length this string must have (optional) */
	minLength?: number;
	/** The maximum length this string may have (optional) */
	maxLength?: number;
	/** The default value */
	default?: string;
}

const defineString = define<ValueMetadataString>();

export interface ValueMetadataBuffer extends ValueMetadataAny {
	type: "buffer";
	/** The minimum length this buffer must have (optional) */
	minLength?: number;
	/** The maximum length this buffer may have (optional) */
	maxLength?: number;
}

const defineBuffer = define<ValueMetadataBuffer>();

export interface ValueMetadataDuration extends ValueMetadataAny {
	type: "duration";
	default?: Duration;
}

const defineDuration = define<ValueMetadataDuration>();

/**
 * Defines how a configuration value is encoded
 */
export enum ConfigValueFormat {
	SignedInteger = 0x00,
	UnsignedInteger = 0x01,
	Enumerated = 0x02, // UnsignedInt, Radio Buttons
	BitField = 0x03, // Check Boxes
}

/** @publicAPI */
export type ConfigValue = number;

export interface ConfigurationMetadata extends ValueMetadataAny {
	// readable and writeable are inherited from ValueMetadataAny
	min?: ConfigValue;
	max?: ConfigValue;
	default?: ConfigValue;
	unit?: string;
	valueSize?: number;
	format?: ConfigValueFormat;
	label?: string;
	description?: string;
	isAdvanced?: boolean;
	requiresReInclusion?: boolean;
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
const _default = defineAny(
	{
		type: "any",
		readable: true,
		writeable: true,
	} as const,
);

const _readonly = {
	writeable: false,
} as const;

const _writeonly = {
	readable: false,
} as const;

/** The default value for metadata: readable and writeable */
const Any = defineAny(
	{
		..._default,
	} as const,
);

/** The default value for readonly metadata */
const ReadOnly = defineAny(
	{
		..._default,
		..._readonly,
	} as const,
);

/** The default value for writeonly metadata */
const WriteOnly = defineAny(
	{
		..._default,
		..._writeonly,
	} as const,
);

/** A boolean value */
const Boolean = defineBoolean(
	{
		..._default,
		type: "boolean",
	} as const,
);

/** A boolean value (readonly) */
const ReadOnlyBoolean = defineBoolean(
	{
		...Boolean,
		..._readonly,
	} as const,
);

/** A boolean value (writeonly) */
const WriteOnlyBoolean = defineBoolean(
	{
		...Boolean,
		..._writeonly,
	} as const,
);

/** Any number */
const Number = defineNumeric(
	{
		..._default,
		type: "number",
	} as const,
);

/** Unsigned number (readonly) */
const ReadOnlyNumber = defineNumeric(
	{
		...Number,
		..._readonly,
	} as const,
);

/** Unsigned number (writeonly) */
const WriteOnlyNumber = defineNumeric(
	{
		...Number,
		..._writeonly,
	} as const,
);

/** Unsigned 8-bit integer */
const UInt8 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.UInt8,
	} as const,
);

/** Unsigned 8-bit integer (readonly) */
const ReadOnlyUInt8 = defineNumeric(
	{
		...UInt8,
		..._readonly,
	} as const,
);

/** Unsigned 8-bit integer (writeonly) */
const WriteOnlyUInt8 = defineNumeric(
	{
		...UInt8,
		..._writeonly,
	} as const,
);

/** Unsigned 16-bit integer */
const UInt16 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.UInt16,
	} as const,
);

/** Unsigned 16-bit integer (readonly) */
const ReadOnlyUInt16 = defineNumeric(
	{
		...UInt16,
		..._readonly,
	} as const,
);

/** Unsigned 16-bit integer (writeonly) */
const WriteOnlyUInt16 = defineNumeric(
	{
		...UInt16,
		..._writeonly,
	} as const,
);

/** Unsigned 24-bit integer */
const UInt24 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.UInt24,
	} as const,
);

/** Unsigned 24-bit integer (readonly) */
const ReadOnlyUInt24 = defineNumeric(
	{
		...UInt24,
		..._readonly,
	} as const,
);

/** Unsigned 24-bit integer (writeonly) */
const WriteOnlyUInt24 = defineNumeric(
	{
		...UInt24,
		..._writeonly,
	} as const,
);

/** Unsigned 32-bit integer */
const UInt32 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.UInt32,
	} as const,
);

/** Unsigned 32-bit integer (readonly) */
const ReadOnlyUInt32 = defineNumeric(
	{
		...UInt32,
		..._readonly,
	} as const,
);

/** Unsigned 32-bit integer (writeonly) */
const WriteOnlyUInt32 = defineNumeric(
	{
		...UInt32,
		..._writeonly,
	} as const,
);

/** Signed 8-bit integer */
const Int8 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.Int8,
	} as const,
);

/** Signed 8-bit integer (readonly) */
const ReadOnlyInt8 = defineNumeric(
	{
		...Int8,
		..._readonly,
	} as const,
);

/** Signed 8-bit integer (writeonly) */
const WriteOnlyInt8 = defineNumeric(
	{
		...Int8,
		..._writeonly,
	} as const,
);

/** Signed 16-bit integer */
const Int16 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.Int16,
	} as const,
);

/** Signed 16-bit integer (readonly) */
const ReadOnlyInt16 = defineNumeric(
	{
		...Int16,
		..._readonly,
	} as const,
);

/** Signed 16-bit integer (writeonly) */
const WriteOnlyInt16 = defineNumeric(
	{
		...Int16,
		..._writeonly,
	} as const,
);

/** Signed 24-bit integer */
const Int24 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.Int24,
	} as const,
);

/** Signed 24-bit integer (readonly) */
const ReadOnlyInt24 = defineNumeric(
	{
		...Int24,
		..._readonly,
	} as const,
);

/** Signed 24-bit integer (writeonly) */
const WriteOnlyInt24 = defineNumeric(
	{
		...Int24,
		..._writeonly,
	} as const,
);

/** Signed 32-bit integer */
const Int32 = defineNumeric(
	{
		..._default,
		type: "number",
		...IntegerLimits.Int32,
	} as const,
);

/** Signed 32-bit integer (readonly) */
const ReadOnlyInt32 = defineNumeric(
	{
		...Int32,
		..._readonly,
	} as const,
);

/** Signed 32-bit integer (writeonly) */
const WriteOnlyInt32 = defineNumeric(
	{
		...Int32,
		..._writeonly,
	} as const,
);

/** Any string */
const String = defineString(
	{
		..._default,
		type: "string",
	} as const,
);

/** Any string (readonly) */
const ReadOnlyString = defineString(
	{
		...String,
		..._readonly,
	} as const,
);

/** Any string (writeonly) */
const WriteOnlyString = defineString(
	{
		...String,
		..._writeonly,
	} as const,
);

/** A (hex) string that represents a color */
const Color = defineString(
	{
		...String,
		type: "color",
	} as const,
);

/** A (hex) string that represents a color (readonly) */
const ReadOnlyColor = defineString(
	{
		...Color,
		..._readonly,
	} as const,
);

/** A (hex) string that represents a color (writeonly) */
const WriteOnlyColor = defineString(
	{
		...Color,
		..._writeonly,
	} as const,
);

// Some predefined CC-specific metadata

/** The level of a Switch */
const Level = defineNumeric(
	{
		...UInt8,
		max: 99,
	} as const,
);

/** The level of a Switch (readonly) */
const ReadOnlyLevel = defineNumeric(
	{
		...Level,
		..._readonly,
	} as const,
);

/** The level of a Switch (writeonly) */
const WriteOnlyLevel = defineNumeric(
	{
		...Level,
		..._writeonly,
	} as const,
);

/** A duration value */
const _Duration = defineDuration(
	{
		..._default,
		type: "duration",
	} as const,
);

/** A duration value (readonly) */
const ReadOnlyDuration = defineDuration(
	{
		..._Duration,
		..._readonly,
	} as const,
);

/** A duration value (writeonly) */
const WriteOnlyDuration = defineDuration(
	{
		..._Duration,
		..._writeonly,
	} as const,
);

/** A buffer */
const _Buffer = defineBuffer(
	{
		..._default,
		type: "buffer",
	} as const,
);

/** A buffer (readonly) */
const ReadOnlyBuffer = defineBuffer(
	{
		..._Buffer,
		..._readonly,
	} as const,
);

/** A buffer (writeonly) */
const WriteOnlyBuffer = defineBuffer({
	..._Buffer,
	..._writeonly,
});

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
