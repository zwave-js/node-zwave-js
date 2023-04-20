"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueMetadata = exports.ConfigValueFormat = exports.enumValuesToMetadataStates = exports.getNumericEnumValues = void 0;
const safe_1 = require("@zwave-js/shared/safe");
const Primitive_1 = require("./Primitive");
const isIntegerRegex = /^\d+$/;
/** Returns an array with the values of a numeric enum */
function getNumericEnumValues(enumeration) {
    return Object.keys(enumeration)
        .filter((val) => isIntegerRegex.test(val))
        .map((val) => parseInt(val, 10));
}
exports.getNumericEnumValues = getNumericEnumValues;
/** Takes an enumeration and an array of values of this enumeration and returns a states record to be used as metadata */
function enumValuesToMetadataStates(enumeration, values) {
    const ret = {};
    if (values == undefined)
        values = getNumericEnumValues(enumeration);
    for (const value of values) {
        ret[value] = (0, safe_1.getEnumMemberName)(enumeration, value);
    }
    return ret;
}
exports.enumValuesToMetadataStates = enumValuesToMetadataStates;
/**
 * Helper function to define metadata templates while checking that they satisfy a constraint.
 */
// TODO: Revisit this when https://github.com/microsoft/TypeScript/issues/47920 is solved
const define = () => 
// The chained function pattern is necessary for partial application of generic types
(definition) => {
    return definition;
};
const defineAny = define();
const defineNumeric = define();
const defineBoolean = define();
const defineString = define();
const defineBuffer = define();
const defineDuration = define();
/**
 * Defines how a configuration value is encoded
 */
var ConfigValueFormat;
(function (ConfigValueFormat) {
    ConfigValueFormat[ConfigValueFormat["SignedInteger"] = 0] = "SignedInteger";
    ConfigValueFormat[ConfigValueFormat["UnsignedInteger"] = 1] = "UnsignedInteger";
    ConfigValueFormat[ConfigValueFormat["Enumerated"] = 2] = "Enumerated";
    ConfigValueFormat[ConfigValueFormat["BitField"] = 3] = "BitField";
})(ConfigValueFormat = exports.ConfigValueFormat || (exports.ConfigValueFormat = {}));
// TODO: lists of allowed values, etc...
// Mixins for value metadata
const _default = defineAny({
    type: "any",
    readable: true,
    writeable: true,
});
const _readonly = {
    writeable: false,
};
const _writeonly = {
    readable: false,
};
/** The default value for metadata: readable and writeable */
const Any = defineAny({
    ..._default,
});
/** The default value for readonly metadata */
const ReadOnly = defineAny({
    ..._default,
    ..._readonly,
});
/** The default value for writeonly metadata */
const WriteOnly = defineAny({
    ..._default,
    ..._writeonly,
});
/** A boolean value */
const Boolean = defineBoolean({
    ..._default,
    type: "boolean",
});
/** A boolean value (readonly) */
const ReadOnlyBoolean = defineBoolean({
    ...Boolean,
    ..._readonly,
});
/** A boolean value (writeonly) */
const WriteOnlyBoolean = defineBoolean({
    ...Boolean,
    ..._writeonly,
});
/** Any number */
const Number = defineNumeric({
    ..._default,
    type: "number",
});
/** Unsigned number (readonly) */
const ReadOnlyNumber = defineNumeric({
    ...Number,
    ..._readonly,
});
/** Unsigned number (writeonly) */
const WriteOnlyNumber = defineNumeric({
    ...Number,
    ..._writeonly,
});
/** Unsigned 8-bit integer */
const UInt8 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.UInt8,
});
/** Unsigned 8-bit integer (readonly) */
const ReadOnlyUInt8 = defineNumeric({
    ...UInt8,
    ..._readonly,
});
/** Unsigned 8-bit integer (writeonly) */
const WriteOnlyUInt8 = defineNumeric({
    ...UInt8,
    ..._writeonly,
});
/** Unsigned 16-bit integer */
const UInt16 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.UInt16,
});
/** Unsigned 16-bit integer (readonly) */
const ReadOnlyUInt16 = defineNumeric({
    ...UInt16,
    ..._readonly,
});
/** Unsigned 16-bit integer (writeonly) */
const WriteOnlyUInt16 = defineNumeric({
    ...UInt16,
    ..._writeonly,
});
/** Unsigned 24-bit integer */
const UInt24 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.UInt24,
});
/** Unsigned 24-bit integer (readonly) */
const ReadOnlyUInt24 = defineNumeric({
    ...UInt24,
    ..._readonly,
});
/** Unsigned 24-bit integer (writeonly) */
const WriteOnlyUInt24 = defineNumeric({
    ...UInt24,
    ..._writeonly,
});
/** Unsigned 32-bit integer */
const UInt32 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.UInt32,
});
/** Unsigned 32-bit integer (readonly) */
const ReadOnlyUInt32 = defineNumeric({
    ...UInt32,
    ..._readonly,
});
/** Unsigned 32-bit integer (writeonly) */
const WriteOnlyUInt32 = defineNumeric({
    ...UInt32,
    ..._writeonly,
});
/** Signed 8-bit integer */
const Int8 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.Int8,
});
/** Signed 8-bit integer (readonly) */
const ReadOnlyInt8 = defineNumeric({
    ...Int8,
    ..._readonly,
});
/** Signed 8-bit integer (writeonly) */
const WriteOnlyInt8 = defineNumeric({
    ...Int8,
    ..._writeonly,
});
/** Signed 16-bit integer */
const Int16 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.Int16,
});
/** Signed 16-bit integer (readonly) */
const ReadOnlyInt16 = defineNumeric({
    ...Int16,
    ..._readonly,
});
/** Signed 16-bit integer (writeonly) */
const WriteOnlyInt16 = defineNumeric({
    ...Int16,
    ..._writeonly,
});
/** Signed 24-bit integer */
const Int24 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.Int24,
});
/** Signed 24-bit integer (readonly) */
const ReadOnlyInt24 = defineNumeric({
    ...Int24,
    ..._readonly,
});
/** Signed 24-bit integer (writeonly) */
const WriteOnlyInt24 = defineNumeric({
    ...Int24,
    ..._writeonly,
});
/** Signed 32-bit integer */
const Int32 = defineNumeric({
    ..._default,
    type: "number",
    ...Primitive_1.IntegerLimits.Int32,
});
/** Signed 32-bit integer (readonly) */
const ReadOnlyInt32 = defineNumeric({
    ...Int32,
    ..._readonly,
});
/** Signed 32-bit integer (writeonly) */
const WriteOnlyInt32 = defineNumeric({
    ...Int32,
    ..._writeonly,
});
/** Any string */
const String = defineString({
    ..._default,
    type: "string",
});
/** Any string (readonly) */
const ReadOnlyString = defineString({
    ...String,
    ..._readonly,
});
/** Any string (writeonly) */
const WriteOnlyString = defineString({
    ...String,
    ..._writeonly,
});
/** A (hex) string that represents a color */
const Color = defineString({
    ...String,
    type: "color",
});
/** A (hex) string that represents a color (readonly) */
const ReadOnlyColor = defineString({
    ...Color,
    ..._readonly,
});
/** A (hex) string that represents a color (writeonly) */
const WriteOnlyColor = defineString({
    ...Color,
    ..._writeonly,
});
// Some predefined CC-specific metadata
/** The level of a Switch */
const Level = defineNumeric({
    ...UInt8,
    max: 99,
});
/** The level of a Switch (readonly) */
const ReadOnlyLevel = defineNumeric({
    ...Level,
    ..._readonly,
});
/** The level of a Switch (writeonly) */
const WriteOnlyLevel = defineNumeric({
    ...Level,
    ..._writeonly,
});
/** A duration value */
const _Duration = defineDuration({
    ..._default,
    type: "duration",
});
/** A duration value (readonly) */
const ReadOnlyDuration = defineDuration({
    ..._Duration,
    ..._readonly,
});
/** A duration value (writeonly) */
const WriteOnlyDuration = defineDuration({
    ..._Duration,
    ..._writeonly,
});
/** A buffer */
const _Buffer = defineBuffer({
    ..._default,
    type: "buffer",
});
/** A buffer (readonly) */
const ReadOnlyBuffer = defineBuffer({
    ..._Buffer,
    ..._readonly,
});
/** A buffer (writeonly) */
const WriteOnlyBuffer = defineBuffer({
    ..._Buffer,
    ..._writeonly,
});
/** A collection of predefined CC value metadata */
exports.ValueMetadata = {
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
//# sourceMappingURL=Metadata.js.map