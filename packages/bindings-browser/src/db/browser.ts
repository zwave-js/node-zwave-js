import {
	type Database,
	type DatabaseFactory,
	type DatabaseOptions,
} from "@zwave-js/shared/bindings";

const DB_NAME_CACHE = "db";
const DB_VERSION_CACHE = 1;
const OBJECT_STORE_CACHE = "cache";

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME_CACHE, DB_VERSION_CACHE);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(OBJECT_STORE_CACHE)) {
				db.createObjectStore(OBJECT_STORE_CACHE, {
					keyPath: ["filename", "valueid"],
				});
			}
		};

		request.onsuccess = (event) => {
			resolve((event.target as IDBOpenDBRequest).result);
		};

		request.onerror = (event) => {
			reject((event.target as IDBOpenDBRequest).error!);
		};
	});
}

/** An implementation of the Database bindings for the browser, based on IndexedDB */
class IndexedDBCache<V> implements Database<V> {
	private filename: string;
	private cache: Map<string, { value: V; timestamp?: number }> = new Map();

	#db: IDBDatabase | undefined;
	async #getDb(): Promise<IDBDatabase> {
		if (!this.#db) {
			this.#db = await openDatabase();
		}
		return this.#db;
	}

	constructor(filename: string) {
		this.filename = filename;
	}

	async open(): Promise<void> {
		const db = await this.#getDb();
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readonly");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		const request = store.openCursor();

		return new Promise((resolve, reject) => {
			request.onsuccess = (event) => {
				const cursor =
					(event.target as IDBRequest<IDBCursorWithValue>).result;
				if (cursor) {
					if (cursor.value.filename === this.filename) {
						this.cache.set(cursor.value.valueid, {
							value: cursor.value.value,
							timestamp: cursor.value.timestamp,
						});
					}
					cursor.continue();
				} else {
					resolve();
				}
			};
			request.onerror = () => reject(request.error!);
		});
	}

	close(): Promise<void> {
		this.cache.clear();
		return Promise.resolve();
	}

	has(key: string): boolean {
		return this.cache.has(key);
	}

	get(key: string): V | undefined {
		return this.cache.get(key)?.value;
	}

	private async _set(
		key: string,
		value: V,
		timestamp?: number,
	): Promise<void> {
		const db = await this.#getDb();
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readwrite");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		store.put({
			filename: this.filename,
			valueid: key,
			value,
			timestamp,
		});
	}

	set(key: string, value: V, updateTimestamp: boolean = true): this {
		const entry = {
			value,
			timestamp: updateTimestamp
				? Date.now()
				: this.cache.get(key)?.timestamp,
		};
		this.cache.set(key, entry);

		// Update IndexedDB in the background
		void this._set(key, value, entry.timestamp);

		return this;
	}

	private async _delete(key: string): Promise<void> {
		const db = await this.#getDb();
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readwrite");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		store.delete([this.filename, key]);
	}

	delete(key: string): boolean {
		const result = this.cache.delete(key);

		// Update IndexedDB in the background
		void this._delete(key);

		return result;
	}

	private async _clear(): Promise<void> {
		const db = await this.#getDb();
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readwrite");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		const request = store.openCursor();

		request.onsuccess = (event) => {
			const cursor =
				(event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				if (cursor.value.filename === this.filename) {
					cursor.delete();
				}
				cursor.continue();
			}
		};
	}

	clear(): void {
		this.cache.clear();

		// Update IndexedDB in the background
		void this._clear();
	}

	getTimestamp(key: string): number | undefined {
		return this.cache.get(key)?.timestamp;
	}

	get size(): number {
		return this.cache.size;
	}

	keys() {
		return this.cache.keys();
	}

	*entries(): MapIterator<[string, V]> {
		for (const [key, { value }] of this.cache.entries()) {
			yield [key, value];
		}
	}
}

export const db: DatabaseFactory = {
	createInstance<V>(
		filename: string,
		_options?: DatabaseOptions<V>,
	): Database<V> {
		return new IndexedDBCache(filename);
	},
};
