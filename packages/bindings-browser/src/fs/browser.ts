import type {
	FSStats,
	FileHandle,
	FileSystem,
} from "@zwave-js/shared/bindings";

const DB_NAME_FS = "filesystem";
const DB_VERSION_FS = 1;
const OBJECT_STORE_FILES = "files";

function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME_FS, DB_VERSION_FS);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(OBJECT_STORE_FILES)) {
				db.createObjectStore(OBJECT_STORE_FILES, { keyPath: "path" });
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

async function writeFile(
	db: IDBDatabase,
	path: string,
	data: Uint8Array,
): Promise<void> {
	const transaction = db.transaction(OBJECT_STORE_FILES, "readwrite");
	const store = transaction.objectStore(OBJECT_STORE_FILES);

	const request = store.put({ path, data });

	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error!);
	});
}

// Datei lesen
async function readFile(db: IDBDatabase, path: string): Promise<Uint8Array> {
	const transaction = db.transaction(OBJECT_STORE_FILES, "readonly");
	const store = transaction.objectStore(OBJECT_STORE_FILES);

	const request = store.get(path);

	return new Promise((resolve, reject) => {
		request.onsuccess = () => {
			const result = request.result;
			if (result) {
				resolve(result.data);
			} else {
				reject(new Error(`File ${path} not found`));
			}
		};
		request.onerror = () => reject(request.error!);
	});
}

async function listKeysWithPrefix(
	db: IDBDatabase,
	prefix: string,
): Promise<string[]> {
	const transaction = db.transaction(OBJECT_STORE_FILES, "readonly");
	const store = transaction.objectStore(OBJECT_STORE_FILES);

	return new Promise((resolve, reject) => {
		const keys: string[] = [];
		const request = store.openCursor();

		request.onsuccess = (event) => {
			const cursor =
				(event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				if (
					typeof cursor.key === "string"
					&& cursor.key.startsWith(prefix)
				) {
					keys.push(cursor.key);
				}
				cursor.continue();
			} else {
				resolve(keys);
			}
		};

		request.onerror = () => reject(request.error!);
	});
}

async function deleteKeysWithPrefix(
	db: IDBDatabase,
	prefix: string,
): Promise<void> {
	const transaction = db.transaction(OBJECT_STORE_FILES, "readwrite");
	const store = transaction.objectStore(OBJECT_STORE_FILES);

	return new Promise((resolve, reject) => {
		const request = store.openCursor();

		request.onsuccess = (event) => {
			const cursor =
				(event.target as IDBRequest<IDBCursorWithValue>).result;
			if (cursor) {
				if (
					typeof cursor.key === "string"
					&& cursor.key.startsWith(prefix)
				) {
					cursor.delete();
				}
				cursor.continue();
			} else {
				resolve();
			}
		};

		request.onerror = () => reject(request.error!);
	});
}

export class IndexedDBFileSystem implements FileSystem {
	#db: IDBDatabase | undefined;
	async #getDb(): Promise<IDBDatabase> {
		if (!this.#db) {
			this.#db = await openDatabase();
		}
		return this.#db;
	}

	async readFile(path: string): Promise<Uint8Array> {
		const db = await this.#getDb();
		return readFile(db, path);
	}

	async writeFile(path: string, data: Uint8Array): Promise<void> {
		const db = await this.#getDb();
		return writeFile(db, path, data);
	}

	async copyFile(source: string, dest: string): Promise<void> {
		const db = await this.#getDb();
		const data = await readFile(db, source);
		await writeFile(db, dest, data);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async open(
		_path: string,
		_flags: {
			read: boolean;
			write: boolean;
			create: boolean;
			truncate: boolean;
		},
	): Promise<FileHandle> {
		throw new Error("Method not implemented.");
	}

	async readDir(path: string): Promise<string[]> {
		const db = await this.#getDb();
		return listKeysWithPrefix(db, path);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async stat(_path: string): Promise<FSStats> {
		throw new Error("Method not implemented.");
	}

	async ensureDir(_path: string): Promise<void> {
		// No need to create directories
	}

	async deleteDir(path: string): Promise<void> {
		const db = await this.#getDb();
		return deleteKeysWithPrefix(db, path);
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	async makeTempDir(_prefix: string): Promise<string> {
		throw new Error("Function not implemented.");
	}
}

export const fs: FileSystem = new IndexedDBFileSystem();
