import { type LogContainer, type LogFactory } from "@zwave-js/core";
import {
	type Database,
	type DatabaseFactory,
	type FSStats,
	type FileHandle,
	type FileSystem,
} from "@zwave-js/shared/bindings";
import { Driver } from "zwave-js";

const OBJECT_STORE_FILES = "files";
const OBJECT_STORE_CACHE = "cache";

// IndexedDB-Datenbank öffnen oder erstellen
function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("filesystem", 1);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains(OBJECT_STORE_FILES)) {
				db.createObjectStore(OBJECT_STORE_FILES, { keyPath: "path" });
			}
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
			reject((event.target as IDBOpenDBRequest).error);
		};
	});
}

const db = await openDatabase();

// Datei erstellen oder schreiben
async function writeFile(path: string, data: Uint8Array): Promise<void> {
	const transaction = db.transaction(OBJECT_STORE_FILES, "readwrite");
	const store = transaction.objectStore(OBJECT_STORE_FILES);

	const request = store.put({ path, data });

	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Datei lesen
async function readFile(path: string): Promise<Uint8Array> {
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
		request.onerror = () => reject(request.error);
	});
}

async function listKeysWithPrefix(prefix: string): Promise<string[]> {
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
					keys.push(cursor.key as string);
				}
				cursor.continue();
			} else {
				resolve(keys);
			}
		};

		request.onerror = () => reject(request.error);
	});
}

async function deleteKeysWithPrefix(prefix: string): Promise<void> {
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

		request.onerror = () => reject(request.error);
	});
}

const webFS: FileSystem = {
	readFile(path) {
		return readFile(path);
	},
	writeFile(path, data) {
		return writeFile(path, data);
	},
	async copyFile(source, dest) {
		const data = await readFile(source);
		await writeFile(dest, data);
	},
	open: function(
		path: string,
		flags: {
			read: boolean;
			write: boolean;
			create: boolean;
			truncate: boolean;
		},
	): Promise<FileHandle> {
		throw new Error("Function not implemented.");
	},
	readDir(path) {
		return listKeysWithPrefix(path);
	},
	stat: function(path: string): Promise<FSStats> {
		throw new Error("Function not implemented.");
	},
	ensureDir: function(path: string): Promise<void> {
		// No need to create directories
	},
	deleteDir(path) {
		return deleteKeysWithPrefix(path);
	},
	makeTempDir: function(prefix: string): Promise<string> {
		throw new Error("Function not implemented.");
	},
};

class IndexedDBBackedCache<V> implements Database<V> {
	private filename: string;
	private cache: Map<string, { value: V; timestamp?: number }> = new Map();

	constructor(filename: string) {
		this.filename = filename;
	}

	async open(): Promise<void> {
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
			request.onerror = () => reject(request.error);
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

	set(key: string, value: V, updateTimestamp: boolean = true): this {
		const entry = {
			value,
			timestamp: updateTimestamp
				? Date.now()
				: this.cache.get(key)?.timestamp,
		};
		this.cache.set(key, entry);

		// Update IndexedDB in the background
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readwrite");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		store.put({
			filename: this.filename,
			valueid: key,
			value,
			timestamp: entry.timestamp,
		});

		return this;
	}

	delete(key: string): boolean {
		const result = this.cache.delete(key);

		// Update IndexedDB in the background
		const transaction = db.transaction(OBJECT_STORE_CACHE, "readwrite");
		const store = transaction.objectStore(OBJECT_STORE_CACHE);
		store.delete([this.filename, key]);

		return result;
	}

	clear(): void {
		this.cache.clear();

		// Update IndexedDB in the background
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

	getTimestamp(key: string): number | undefined {
		return this.cache.get(key)?.timestamp;
	}

	get size(): number {
		return this.cache.size;
	}

	keys() {
		return this.cache.keys();
	}

	*entries() {
		return function*() {
			for (const [key, { value }] of this.cache.entries()) {
				yield [key, value];
			}
		};
	}
}

const logContainer: LogContainer = {
	updateConfiguration: (config) => {
		// noop
	},
	getConfiguration: () => {
		return {
			enabled: true,
			level: "debug",
			transports: [],
			logToFile: false,
			filename: "zwavejs.log",
			forceConsole: false,
			maxFiles: 0,
		};
	},
	destroy: () => {
		// noop
	},
	getLogger: (label) => {
		return {
			log(info) {
				if (info.level === "error") {
					console.error(info.message);
				} else {
					console.log(`[${label}]`, info);
				}
			},
		};
	},
	isLoglevelVisible: (loglevel) => {
		return loglevel !== "silly";
	},
	isNodeLoggingVisible: (nodeId) => {
		return true;
	},
};

async function init() {
	let port: SerialPort;
	try {
		port = await navigator.serial.requestPort({
			filters: [
				{ usbVendorId: 0x10c4, usbProductId: 0xea60 },
			],
		});
		await port.open({ baudRate: 115200 });
	} catch (e) {
		console.error(e);
		return;
	}

	const sink: UnderlyingSink<Uint8Array> = {
		close() {
			port.close();
		},
		async write(chunk) {
			let writer: WritableStreamDefaultWriter<Uint8Array>;
			try {
				writer = port.writable.getWriter();
				await writer.write(chunk);
			} finally {
				writer.releaseLock();
			}
		},
	};

	const source: UnderlyingDefaultSource<Uint8Array> = {
		async start(controller) {
			const reader = port.readable.getReader();
			try {
				while (true) {
					const { value, done } = await reader.read();
					if (done) {
						break;
					}
					controller.enqueue(value);
				}
			} finally {
				reader.releaseLock();
			}
		},
	};

	const serialBinding = () => Promise.resolve({ source, sink });

	const dbFactory: DatabaseFactory = {
		createInstance(filename, options) {
			return new IndexedDBBackedCache(filename);
		},
	};

	const logFactory: LogFactory = (config) => logContainer;

	const d = new Driver(serialBinding, {
		host: {
			fs: webFS,
			db: dbFactory,
			log: logFactory,
			serial: {
				// no listing, no creating by path!
			},
		},
	});

	await d.start();
}

document.getElementById("connect").addEventListener("click", init);
