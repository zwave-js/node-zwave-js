import type { Duration } from "./Duration";
/** Returns an array with the values of a numeric enum */
export declare function getNumericEnumValues<T extends Record<string, any>>(enumeration: T): readonly number[];
/** Takes an enumeration and an array of values of this enumeration and returns a states record to be used as metadata */
export declare function enumValuesToMetadataStates<T extends Record<string, any>>(enumeration: T, values?: readonly number[]): Record<number, string>;
export type ValueType = "number" | "boolean" | "string" | "number[]" | "boolean[]" | "string[]" | "duration" | "color" | "buffer" | "any";
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
/**
 * Defines how a configuration value is encoded
 */
export declare enum ConfigValueFormat {
    SignedInteger = 0,
    UnsignedInteger = 1,
    Enumerated = 2,
    BitField = 3
}
/**
 * @publicAPI
 * A configuration value is either a single number or a bit map
 */
export type ConfigValue = number | Set<number>;
export interface ConfigurationMetadata extends ValueMetadataAny {
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
    states?: Record<number, string>;
    allowManualEntry?: boolean;
    isFromConfig?: boolean;
}
export type ValueMetadata = ValueMetadataAny | ValueMetadataNumeric | ValueMetadataBoolean | ValueMetadataString | ValueMetadataDuration | ValueMetadataBuffer | ConfigurationMetadata;
/** A collection of predefined CC value metadata */
export declare const ValueMetadata: {
    /** The default value for metadata: readable and writeable */
    Any: Readonly<{
        readonly type: "any";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** The default value for readonly metadata */
    ReadOnly: Readonly<{
        readonly writeable: false;
        readonly type: "any";
        readonly readable: true;
    }>;
    /** The default value for writeonly metadata */
    WriteOnly: Readonly<{
        readonly readable: false;
        readonly type: "any";
        readonly writeable: true;
    }>;
    /** A numeric value */
    Number: Readonly<{
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A numeric value (readonly) */
    ReadOnlyNumber: Readonly<{
        readonly writeable: false;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** A numeric value (writeonly) */
    WriteOnlyNumber: Readonly<{
        readonly readable: false;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Unsigned 8-bit integer */
    UInt8: Readonly<{
        readonly min: 0;
        readonly max: 255;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Unsigned 16-bit integer */
    UInt16: Readonly<{
        readonly min: 0;
        readonly max: 65535;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Unsigned 24-bit integer */
    UInt24: Readonly<{
        readonly min: 0;
        readonly max: 16777215;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Unsigned 32-bit integer */
    UInt32: Readonly<{
        readonly min: 0;
        readonly max: 4294967295;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Signed 8-bit integer */
    Int8: Readonly<{
        readonly min: -128;
        readonly max: 127;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Signed 16-bit integer */
    Int16: Readonly<{
        readonly min: -32768;
        readonly max: 32767;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Signed 24-bit integer */
    Int24: Readonly<{
        readonly min: -8388608;
        readonly max: 8388607;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Signed 32-bit integer */
    Int32: Readonly<{
        readonly min: -2147483648;
        readonly max: 2147483647;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** Unsigned 8-bit integer (readonly) */
    ReadOnlyUInt8: Readonly<{
        readonly writeable: false;
        readonly min: 0;
        readonly max: 255;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Unsigned 16-bit integer (readonly) */
    ReadOnlyUInt16: Readonly<{
        readonly writeable: false;
        readonly min: 0;
        readonly max: 65535;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Unsigned 24-bit integer (readonly) */
    ReadOnlyUInt24: Readonly<{
        readonly writeable: false;
        readonly min: 0;
        readonly max: 16777215;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Unsigned 32-bit integer (readonly) */
    ReadOnlyUInt32: Readonly<{
        readonly writeable: false;
        readonly min: 0;
        readonly max: 4294967295;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Signed 8-bit integer (readonly) */
    ReadOnlyInt8: Readonly<{
        readonly writeable: false;
        readonly min: -128;
        readonly max: 127;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Signed 16-bit integer (readonly) */
    ReadOnlyInt16: Readonly<{
        readonly writeable: false;
        readonly min: -32768;
        readonly max: 32767;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Signed 24-bit integer (readonly) */
    ReadOnlyInt24: Readonly<{
        readonly writeable: false;
        readonly min: -8388608;
        readonly max: 8388607;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Signed 32-bit integer (readonly) */
    ReadOnlyInt32: Readonly<{
        readonly writeable: false;
        readonly min: -2147483648;
        readonly max: 2147483647;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** Unsigned 8-bit integer (writeonly) */
    WriteOnlyUInt8: Readonly<{
        readonly readable: false;
        readonly min: 0;
        readonly max: 255;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Unsigned 16-bit integer (writeonly) */
    WriteOnlyUInt16: Readonly<{
        readonly readable: false;
        readonly min: 0;
        readonly max: 65535;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Unsigned 24-bit integer (writeonly) */
    WriteOnlyUInt24: Readonly<{
        readonly readable: false;
        readonly min: 0;
        readonly max: 16777215;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Unsigned 32-bit integer (writeonly) */
    WriteOnlyUInt32: Readonly<{
        readonly readable: false;
        readonly min: 0;
        readonly max: 4294967295;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Signed 8-bit integer (writeonly) */
    WriteOnlyInt8: Readonly<{
        readonly readable: false;
        readonly min: -128;
        readonly max: 127;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Signed 16-bit integer (writeonly) */
    WriteOnlyInt16: Readonly<{
        readonly readable: false;
        readonly min: -32768;
        readonly max: 32767;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Signed 24-bit integer (writeonly) */
    WriteOnlyInt24: Readonly<{
        readonly readable: false;
        readonly min: -8388608;
        readonly max: 8388607;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** Signed 32-bit integer (writeonly) */
    WriteOnlyInt32: Readonly<{
        readonly readable: false;
        readonly min: -2147483648;
        readonly max: 2147483647;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** The level of a Switch (0-99) */
    Level: Readonly<{
        readonly max: 99;
        readonly min: 0;
        readonly type: "number";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** The level of a Switch (0-99, readonly) */
    ReadOnlyLevel: Readonly<{
        readonly writeable: false;
        readonly max: 99;
        readonly min: 0;
        readonly type: "number";
        readonly readable: true;
    }>;
    /** The level of a Switch (0-99, writeonly) */
    WriteOnlyLevel: Readonly<{
        readonly readable: false;
        readonly max: 99;
        readonly min: 0;
        readonly type: "number";
        readonly writeable: true;
    }>;
    /** A boolean value */
    Boolean: Readonly<{
        readonly type: "boolean";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A boolean value (readonly) */
    ReadOnlyBoolean: Readonly<{
        readonly writeable: false;
        readonly type: "boolean";
        readonly readable: true;
    }>;
    /** A boolean value (writeonly) */
    WriteOnlyBoolean: Readonly<{
        readonly readable: false;
        readonly type: "boolean";
        readonly writeable: true;
    }>;
    /** A string */
    String: Readonly<{
        readonly type: "string";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A string (readonly) */
    ReadOnlyString: Readonly<{
        readonly writeable: false;
        readonly type: "string";
        readonly readable: true;
    }>;
    /** A string (writeonly) */
    WriteOnlyString: Readonly<{
        readonly readable: false;
        readonly type: "string";
        readonly writeable: true;
    }>;
    /** A (hex) string that represents a color */
    Color: Readonly<{
        readonly type: "color";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A (hex) string that represents a color (readonly) */
    ReadOnlyColor: Readonly<{
        readonly writeable: false;
        readonly type: "color";
        readonly readable: true;
    }>;
    /** A (hex) string that represents a color (writeonly) */
    WriteOnlyColor: Readonly<{
        readonly readable: false;
        readonly type: "color";
        readonly writeable: true;
    }>;
    /** A duration value */
    Duration: Readonly<{
        readonly type: "duration";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A duration value (readonly) */
    ReadOnlyDuration: Readonly<{
        readonly writeable: false;
        readonly type: "duration";
        readonly readable: true;
    }>;
    /** A duration value (writeonly) */
    WriteOnlyDuration: Readonly<{
        readonly readable: false;
        readonly type: "duration";
        readonly writeable: true;
    }>;
    /** A buffer */
    Buffer: Readonly<{
        readonly type: "buffer";
        readonly readable: true;
        readonly writeable: true;
    }>;
    /** A buffer (readonly) */
    ReadOnlyBuffer: Readonly<{
        readonly writeable: false;
        readonly type: "buffer";
        readonly readable: true;
    }>;
    /** A buffer (writeonly) */
    WriteOnlyBuffer: Readonly<{
        readable: false;
        type: "buffer";
        writeable: true;
    }>;
};
//# sourceMappingURL=Metadata.d.ts.map