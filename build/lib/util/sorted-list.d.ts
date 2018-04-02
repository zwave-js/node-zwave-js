import { Comparer } from "./comparable";
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
    /** Removes the first item from the list and returns it */
    shift(): T;
    /** Removes the last item from the list and returns it */
    pop(): T;
    /** Removes a specific node from the list */
    private removeNode(node);
    /** Tests if the given item is contained in the list */
    contains(item: T): boolean;
    clear(): void;
    [Symbol.iterator](): IterableIterator<T>;
    toArray(): T[];
}
