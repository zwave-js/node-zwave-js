import { type LogContainer, type LogFactory } from "@zwave-js/core";
import {
	type Database,
	type DatabaseFactory,
	type FSStats,
	type FileHandle,
	type FileSystem,
} from "@zwave-js/shared/bindings";
import { Driver } from "zwave-js";

const webFS: FileSystem = {
	readFile: function(path: string): Promise<Uint8Array> {
		throw new Error("Function not implemented.");
	},
	writeFile: function(path: string, data: Uint8Array): Promise<void> {
		throw new Error("Function not implemented.");
	},
	copyFile: function(source: string, dest: string): Promise<void> {
		throw new Error("Function not implemented.");
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
	readDir: function(path: string): Promise<string[]> {
		throw new Error("Function not implemented.");
	},
	stat: function(path: string): Promise<FSStats> {
		throw new Error("Function not implemented.");
	},
	ensureDir: function(path: string): Promise<void> {
		throw new Error("Function not implemented.");
	},
	deleteDir: function(path: string): Promise<void> {
		throw new Error("Function not implemented.");
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

const logContainer: LogContainer = {};

async function init() {
	let port: SerialPort;
	try {
		port = await navigator.serial.requestPort();
		await port.open({ baudRate: 115200 });
	} catch (e) {
		console.error(e);
		return;
	}

	const serialBinding = () =>
		Promise.resolve({
			source: port.readable,
			sink: port.writable,
		});

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
