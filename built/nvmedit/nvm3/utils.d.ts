import type { NVM3Object } from "./object";
import type { NVM3Page } from "./page";
/** Counts the number of unset bits in the given word */
export declare function computeBergerCode(word: number, numBits?: number): number;
export declare function validateBergerCode(word: number, code: number, numBits?: number): void;
export declare function computeBergerCodeMulti(words: number[], numBits: number): number;
export declare function validateBergerCodeMulti(words: number[], numBits: number): void;
export declare function mapToObject<T, TMap extends Map<string | number, T>>(map: TMap): Record<string, T>;
export declare function dumpPage(page: NVM3Page, json?: boolean): void;
export declare function dumpObject(obj: NVM3Object, json?: boolean): void;
//# sourceMappingURL=utils.d.ts.map