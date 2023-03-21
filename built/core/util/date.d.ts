export interface DSTInfo {
    startDate: Date;
    endDate: Date;
    standardOffset: number;
    dstOffset: number;
}
/**
 * Returns a fallback DSTInfo in case we cannot determine the correct one.
 * This fallback has no additional DST shift.
 * The dummy DST starts on March 31st and ends on October 31st, both times at 01:00 UTC.
 * @param defaultOffset - The offset to use for both standardOffset and dstOffset
 */
export declare function getDefaultDSTInfo(defaultOffset?: number): DSTInfo;
/** Returns the current system's daylight savings time information if possible */
export declare function getDSTInfo(now?: Date): DSTInfo;
/** Returns a timestamp with nano-second precision */
export declare function highResTimestamp(): number;
export declare const timespan: Readonly<{
    seconds: (num: number) => number;
    minutes: (num: number) => number;
    hours: (num: number) => number;
    days: (num: number) => number;
}>;
export declare function formatDate(date: Date, format: string): string;
//# sourceMappingURL=date.d.ts.map