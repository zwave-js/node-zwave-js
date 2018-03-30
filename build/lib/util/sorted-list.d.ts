export declare type Comparer<T> = (a: T, b: T) => -1 | 0 | 1;
export declare class SortedList<T> {
    private readonly comparer;
    private first;
    private last;
    private _length;
    readonly length: number;
    constructor(source?: Iterable<T>, comparer?: Comparer<T>);
    /** Inserts new items into the sorted list and returns the new length */
    add(...items: T[]): number;
    /** Adds a single item to the list */
    private addOne(item);
    /** Removes items from the sorted list and returns the new length */
    remove(...items: T[]): number;
    /** Removes a single item from the list */
    private removeOne(item);
    /** Tests if the given item is contained in the list */
    contains(item: T): boolean;
    clear(): void;
    [Symbol.iterator](): IterableIterator<T>;
    toArray(): T[];
}
