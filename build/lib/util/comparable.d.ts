export declare type CompareResult = -1 | 0 | 1;
export declare type Comparer<T> = (a: T, b: T) => CompareResult;
export interface Comparable<T> {
    compareTo(other: T): CompareResult;
}
export declare function isComparable<T>(obj: T | Comparable<T>): obj is Comparable<T>;
export declare function compareNumberOrString(a: number | string, b: number | string): CompareResult;
