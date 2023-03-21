import type { JSONObject } from "@zwave-js/shared";
export type TimeoutUnit = "seconds" | "minutes" | "none" | "infinite";
/** Represents a timeout that is used by some command classes */
export declare class Timeout {
    unit: TimeoutUnit;
    constructor(value: number, unit: TimeoutUnit);
    private _value;
    get value(): number;
    set value(v: number);
    /** Parses a timeout as represented in Report commands */
    static parse(payload: number): Timeout;
    static parse(payload: undefined): undefined;
    /** Serializes a timeout for a Set command */
    serialize(): number;
    toJSON(): string | JSONObject;
    toMilliseconds(): number | undefined;
    toString(): string;
}
//# sourceMappingURL=Timeout.d.ts.map