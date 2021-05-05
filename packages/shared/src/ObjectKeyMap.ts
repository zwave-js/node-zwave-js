import { composeObject, entries } from "alcalzone-shared/objects";

export class ObjectKeyMap<TKey extends Record<string | number, any>, TValue> {
	public constructor(
		entries?: [TKey, TValue][],
		defaultKeyProps?: Partial<TKey>,
	) {
		if (entries?.length) {
			for (const [key, value] of entries) {
				this.set(key, value);
			}
		}
		this.defaultKeyProps = defaultKeyProps;
	}

	private _map = new Map<string, TValue>();
	private defaultKeyProps: Partial<TKey> | undefined;

	public has(key: TKey): boolean {
		return this._map.has(this.keyToString(key));
	}

	public get(key: TKey): TValue | undefined {
		return this._map.get(this.keyToString(key));
	}

	public set(key: TKey, value: TValue): void {
		this._map.set(this.keyToString(key), value);
	}

	public delete(key: TKey): boolean {
		return this._map.delete(this.keyToString(key));
	}

	public clear(): void {
		this._map.clear();
	}

	public get size(): number {
		return this._map.size;
	}

	public forEach(
		callbackfn: (value: TValue, key: TKey, map: this) => void,
	): void {
		this._map.forEach((value, keyAsString) => {
			callbackfn(value, JSON.parse(keyAsString), this);
		});
	}

	public entries(): IterableIterator<[TKey, TValue]> {
		const map = this._map;
		return (function* () {
			const _entries = map.entries();
			let entry = _entries.next();
			while (!entry.done) {
				const objKey = JSON.parse(entry.value[0]);
				yield [objKey, entry.value[1]] as [TKey, TValue];
				entry = _entries.next();
			}
		})();
	}

	public [Symbol.iterator](): IterableIterator<[TKey, TValue]> {
		return this.entries();
	}

	public keys(): IterableIterator<TKey> {
		const map = this._map;
		return (function* () {
			const _keys = map.entries();
			let key = _keys.next();
			while (!key.done) {
				const objKey = JSON.parse(key.value[0]) as TKey;
				yield objKey;
				key = _keys.next();
			}
		})();
	}

	public values(): IterableIterator<TValue> {
		return this._map.values();
	}

	private keyToString(key: TKey): string {
		const filledKey = { ...key };
		if (this.defaultKeyProps) {
			for (const [required, def] of entries(this.defaultKeyProps)) {
				if (!(required in filledKey)) filledKey[required as any] = def;
			}
		}
		const _key = composeObject(
			entries(filledKey)
				.filter(([, value]) => value != undefined)
				.sort(([keyA], [keyB]) =>
					keyA > keyB ? 1 : keyA < keyB ? -1 : 0,
				),
		);
		return JSON.stringify(_key);
	}
}

type PickSymbolIterator<T> = T extends { [Symbol.iterator]: infer V }
	? T & { [Symbol.iterator]: V }
	: T;

export type ReadonlyObjectKeyMap<
	TKey extends Record<string | number, any>,
	TValue
> = Pick<
	ObjectKeyMap<TKey, TValue>,
	"has" | "get" | "entries" | "keys" | "values" | "size"
> &
	PickSymbolIterator<ObjectKeyMap<TKey, TValue>>;
