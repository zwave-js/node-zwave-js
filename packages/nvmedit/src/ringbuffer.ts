export class RingBuffer<T> {
	public constructor(items: Iterable<T>) {
		this._array.push(...items);
	}

	private index: number = -1;

	public get current(): T {
		return this._array[this.index];
	}

	public next(): T {
		this.index++;
		if (this.index >= this._array.length) this.index = 0;
		return this._array[this.index];
	}

	public prev(): T {
		this.index--;
		if (this.index < 0) this.index = this._array.length - 1;
		return this._array[this.index];
	}

	/** Inserts an item after the current position */
	public push(item: T): void {
		this._array.splice(this.index + 1, 0, item);
		this.index++;
	}

	/** Removes the current item and returns it */
	public pop(): T {
		const ret = this._array.splice(this.index, 1)[0];
		if (this.index >= this._array.length) this.index--;
		return ret;
	}

	public get size(): number {
		return this._array.length;
	}

	private _array: T[] = [];

	[Symbol.iterator](): IterableIterator<T> {
		return (function* (me: RingBuffer<T>) {
			if (!me.size) return;
			yield me.current;
			while (true) yield me.next();
		})(this);
	}
}
