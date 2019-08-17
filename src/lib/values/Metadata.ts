export interface ValueMetadataBase {
	/** Whether the value can be read. By default all values are assumed readable */
	readable: boolean;
	/** Whether the value can be written. By default all values are assumed readable */
	writeable: boolean;
	/** A description of the value */
	description?: string;
	/** A human-readable name for the property */
	label?: string;
}

export interface ValueMetadataAny extends ValueMetadataBase {
	/** The default value */
	default?: unknown;
}

export interface ValueMetadataNumeric extends ValueMetadataBase {
	/** The minimum value that can be assigned to a CC value (optional) */
	min?: number;
	/** The maximum value that can be assigned to a CC value (optional) */
	max?: number;
	/** When only certain values between min and max are allowed, this determines the step size */
	steps?: number;
	/** The default value */
	default?: number;
}

export type ValueMetadata = ValueMetadataAny | ValueMetadataNumeric;

// TODO: lists of allowed values, etc...

/** The default value for metadata: readable and writeable */
const _default: ValueMetadataBase = {
	readable: true,
	writeable: true,
};

/** The default value for readonly metadata */
const ReadOnly: ValueMetadataBase = {
	readable: true,
	writeable: false,
};

/** The default value for writeonly metadata */
const WriteOnly: ValueMetadataBase = {
	readable: false,
	writeable: true,
};

/** Unsigned 8-bit integer */
const UInt8: ValueMetadataNumeric = {
	..._default,
	min: 0,
	max: 0xff,
};

/** Unsigned 8-bit integer (readonly) */
const ReadOnlyUInt8: ValueMetadataNumeric = {
	...UInt8,
	...ReadOnly,
};

/** Unsigned 8-bit integer (writeonly) */
const WriteOnlyUInt8: ValueMetadataNumeric = {
	...UInt8,
	...WriteOnly,
};

/** Unsigned 16-bit integer */
const UInt16: ValueMetadataNumeric = {
	..._default,
	min: 0,
	max: 0xffff,
};

/** Unsigned 16-bit integer (readonly) */
const ReadOnlyUInt16: ValueMetadataNumeric = {
	...UInt16,
	...ReadOnly,
};

/** Unsigned 16-bit integer (writeonly) */
const WriteOnlyUInt16: ValueMetadataNumeric = {
	...UInt16,
	...WriteOnly,
};

/** Unsigned 24-bit integer */
const UInt24: ValueMetadataNumeric = {
	..._default,
	min: 0,
	max: 0xffffffff,
};

/** Unsigned 24-bit integer (readonly) */
const ReadOnlyUInt24: ValueMetadataNumeric = {
	...UInt24,
	...ReadOnly,
};

/** Unsigned 24-bit integer (writeonly) */
const WriteOnlyUInt24: ValueMetadataNumeric = {
	...UInt24,
	...WriteOnly,
};

/** Unsigned 32-bit integer */
const UInt32: ValueMetadataNumeric = {
	..._default,
	min: 0,
	max: 0xffffffff,
};

/** Unsigned 32-bit integer (readonly) */
const ReadOnlyUInt32: ValueMetadataNumeric = {
	...UInt32,
	...ReadOnly,
};

/** Unsigned 32-bit integer (writeonly) */
const WriteOnlyUInt32: ValueMetadataNumeric = {
	...UInt32,
	...WriteOnly,
};

/** Signed 8-bit integer */
const Int8: ValueMetadataNumeric = {
	..._default,
	min: -0x80,
	max: 0x7f,
};

/** Signed 8-bit integer (readonly) */
const ReadOnlyInt8: ValueMetadataNumeric = {
	...Int8,
	...ReadOnly,
};

/** Signed 8-bit integer (writeonly) */
const WriteOnlyInt8: ValueMetadataNumeric = {
	...Int8,
	...WriteOnly,
};

/** Signed 16-bit integer */
const Int16: ValueMetadataNumeric = {
	..._default,
	min: -0x8000,
	max: 0x7fff,
};

/** Signed 16-bit integer (readonly) */
const ReadOnlyInt16: ValueMetadataNumeric = {
	...Int16,
	...ReadOnly,
};

/** Signed 16-bit integer (writeonly) */
const WriteOnlyInt16: ValueMetadataNumeric = {
	...Int16,
	...WriteOnly,
};

/** Signed 24-bit integer */
const Int24: ValueMetadataNumeric = {
	..._default,
	min: -0x800000,
	max: 0x7fffff,
};

/** Signed 24-bit integer (readonly) */
const ReadOnlyInt24: ValueMetadataNumeric = {
	...Int24,
	...ReadOnly,
};

/** Signed 24-bit integer (writeonly) */
const WriteOnlyInt24: ValueMetadataNumeric = {
	...Int24,
	...WriteOnly,
};

/** Signed 32-bit integer */
const Int32: ValueMetadataNumeric = {
	..._default,
	min: -0x80000000,
	max: 0x7fffffff,
};

/** Signed 32-bit integer (readonly) */
const ReadOnlyInt32: ValueMetadataNumeric = {
	...Int32,
	...ReadOnly,
};

/** Signed 32-bit integer (writeonly) */
const WriteOnlyInt32: ValueMetadataNumeric = {
	...Int32,
	...WriteOnly,
};

// Some predefined CC-specific metadata

/** The level of a Switch */
const Level: ValueMetadataNumeric = {
	..._default,
	min: 0,
	max: 99,
};

/** The level of a Switch (readonly) */
const ReadOnlyLevel: ValueMetadataNumeric = {
	...Level,
	...ReadOnly,
};

/** The level of a Switch (writeonly) */
const WriteOnlyLevel: ValueMetadataNumeric = {
	...Level,
	...WriteOnly,
};

/** A collection of predefined CC value metadata */
export const ValueMetadata = {
	/** The default value for metadata: readable and writeable */
	default: Object.freeze(_default),
	/** The default value for readonly metadata */
	ReadOnly: Object.freeze(ReadOnly),
	/** The default value for writeonly metadata */
	WriteOnly: Object.freeze(WriteOnly),
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
};
