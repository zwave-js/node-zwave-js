export type CompareResult = -1 | 0 | 1;
export type Comparer<T> = (a: T, b: T) => CompareResult;
export interface Comparable<T> {
	compareTo(other: T): CompareResult;
}
export function isComparable<T>(obj: T | Comparable<T>): obj is Comparable<T> {
	return (obj as Comparable<T>).compareTo != null;
}

export function compareNumberOrString(a: number | string, b: number | string): CompareResult {
	return b > a ? 1 :
		b === a ? 0 :
		-1
	;
}
