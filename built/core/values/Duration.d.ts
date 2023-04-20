import type { JSONObject } from "@zwave-js/shared";
export type DurationUnit = "seconds" | "minutes" | "unknown" | "default";
/** Represents a duration that is used by some command classes */
export declare class Duration {
    unit: DurationUnit;
    constructor(value: number, unit: DurationUnit);
    private _value;
    get value(): number;
    set value(v: number);
    /** Parses a duration as represented in Report commands */
    static parseReport(payload?: number): Duration | undefined;
    /** Parses a duration as represented in Set commands */
    static parseSet(payload?: number): Duration | undefined;
    /**
     * Parses a user-friendly duration string in the format "Xs", "Xm", "XhYm" or "XmYs", for example "10m20s".
     * If that cannot be exactly represented as a Z-Wave duration, the nearest possible representation will be used.
     */
    static parseString(text: string): Duration | undefined;
    /**
     * Takes a user-friendly duration string or a Duration instance and returns a Duration instance (if one was given)
     */
    static from(input: "default"): Duration;
    static from(input?: Duration | string): Duration | undefined;
    /** Serializes a duration for a Set command */
    serializeSet(): number;
    /** Serializes a duration for a Report command */
    serializeReport(): number;
    toJSON(): string | JSONObject;
    toMilliseconds(): number | undefined;
    toString(): string;
}
//# sourceMappingURL=Duration.d.ts.map