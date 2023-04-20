/// <reference types="node" />
/** Translates a null-terminated (C++) string to JS */
export declare function cpp2js(str: string): string;
/**
 * Formats a number as a hexadecimal string, while making sure that the length is a multiple of two digits.
 * `undefined` and `null` get converted to `"undefined"`.
 *
 * @param val The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
export declare function num2hex(val: number | undefined | null, uppercase?: boolean): string;
/**
 * Formats an ID as a 4-digit lowercase hexadecimal string, to guarantee a representation that matches the Z-Wave specs.
 * This is meant to be used to display manufacturer ID, product type and product ID, etc.
 */
export declare function formatId(id: number | string): string;
export declare function stringify(arg: unknown, space?: 4 | "\t"): string;
/**
 * Formats a buffer as an hexadecimal string, with an even number of digits.
 * Returns `"(empty)"` if the buffer is empty.
 *
 * @param buffer The value to be formatted as hexadecimal
 * @param uppercase Whether uppercase letters should be used
 */
export declare function buffer2hex(buffer: Buffer, uppercase?: boolean): string;
export declare function isPrintableASCII(text: string): boolean;
export declare function isPrintableASCIIWithNewlines(text: string): boolean;
export declare function compareStrings(a: string, b: string): number;
export declare function formatTime(hour: number, minute: number): string;
export declare function formatDate(year: number, month: number, day: number): string;
//# sourceMappingURL=strings.d.ts.map