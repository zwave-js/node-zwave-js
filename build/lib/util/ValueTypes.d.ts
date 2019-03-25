declare type Brand<K, T> = K & {
    __brand: T;
};
export declare type BrandedUnknown<T> = Brand<"unknown", T>;
export declare type Maybe<T> = T | BrandedUnknown<T>;
export declare const unknownNumber: Maybe<number>;
export declare const unknownBoolean: Maybe<boolean>;
export declare function parseMaybeBoolean(val: number): Maybe<boolean> | undefined;
export declare function parseBoolean(val: number): boolean | undefined;
export declare function parseMaybeNumber(val: number): Maybe<number> | undefined;
export declare function parseNumber(val: number): number | undefined;
export {};
