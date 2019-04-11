export declare type DurationUnit = "seconds" | "minutes" | "unknown" | "default";
export declare class Duration {
    unit: DurationUnit;
    constructor(value: number, unit: DurationUnit);
    private _value;
    value: number;
    /** Parses a duration as represented in Report commands */
    static parseReport(payload: number): Duration;
    /** Serializes a duration for a Set command */
    serializeSet(): number;
}
