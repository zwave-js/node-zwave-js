/**
 * Pads a string to the given length by repeatedly prepending the filler at the beginning of the string.
 * @param str The string to pad
 * @param targetLen The target length
 * @param fill The filler string to prepend. Depending on the lenght requirements, this might get truncated.
 */
export declare function padStart(str: string, targetLen: number, fill?: string): string;
/** Translates a null-terminated (C++) string to JS */
export declare function cpp2js(str: string): string;
export declare function num2hex(val: number | undefined | null): string;
export declare function stringify(arg: any): string;
