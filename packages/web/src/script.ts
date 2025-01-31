import { type LogContainer, type LogFactory } from "@zwave-js/core";
import {
	type Database,
	type DatabaseFactory,
	type FSStats,
	type FileHandle,
	type FileSystem,
} from "@zwave-js/shared/bindings";
import { Driver } from "zwave-js";

// IndexedDB-Datenbank öffnen oder erstellen
function openDatabase(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open("filesystem", 1);

		request.onupgradeneeded = (event) => {
			const db = (event.target as IDBOpenDBRequest).result;
			if (!db.objectStoreNames.contains("files")) {
				db.createObjectStore("files", { keyPath: "path" });
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

// Datei erstellen oder schreiben
async function writeFile(path: string, data: Uint8Array): Promise<void> {
	const db = await openDatabase();
	const transaction = db.transaction("files", "readwrite");
	const store = transaction.objectStore("files");

	const request = store.put({ path, data });

	return new Promise((resolve, reject) => {
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

// Datei lesen
async function readFile(path: string): Promise<Uint8Array> {
	const db = await openDatabase();
	const transaction = db.transaction("files", "readonly");
	const store = transaction.objectStore("files");

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
	const db = await openDatabase();
	const transaction = db.transaction("files", "readonly");
	const store = transaction.objectStore("files");

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
	const db = await openDatabase();
	const transaction = db.transaction("files", "readwrite");
	const store = transaction.objectStore("files");

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

const webDB: Database<any> = {
	open: function(): Promise<void> {
		throw new Error("Function not implemented.");
	},
	close: function(): Promise<void> {
		throw new Error("Function not implemented.");
	},
	has: function(key: string): boolean {
		throw new Error("Function not implemented.");
	},
	get: function(key: string) {
		throw new Error("Function not implemented.");
	},
	set: function(
		key: string,
		value: any,
		updateTimestamp?: boolean,
	): Database<any> {
		throw new Error("Function not implemented.");
	},
	delete: function(key: string): boolean {
		throw new Error("Function not implemented.");
	},
	clear: function(): void {
		throw new Error("Function not implemented.");
	},
	getTimestamp: function(key: string): number | undefined {
		throw new Error("Function not implemented.");
	},
	size: 0,
	keys: function(): MapIterator<string> {
		throw new Error("Function not implemented.");
	},
	entries: function(): MapIterator<[string, any]> {
		throw new Error("Function not implemented.");
	},
};

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
			return webDB;
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
