import {
	fileHandleToReadableStream,
	fileHandleToWritableStream,
} from "@zwave-js/shared";
import type {
	FSStats,
	FileHandle,
	FileSystem,
} from "@zwave-js/shared/bindings";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** An implementation of the FileSystem bindings for Node.js */
export const fs: FileSystem = {
	readDir(path: string): Promise<string[]> {
		return fsp.readdir(path);
	},
	readFile(path: string): Promise<Uint8Array> {
		return fsp.readFile(path);
	},
	writeFile(path: string, data: Uint8Array): Promise<void> {
		return fsp.writeFile(path, data);
	},
	copyFile(source: string, dest: string): Promise<void> {
		return fsp.copyFile(source, dest);
	},
	async ensureDir(path: string): Promise<void> {
		await fsp.mkdir(path, { recursive: true });
	},
	deleteDir(path: string): Promise<void> {
		return fsp.rm(path, { recursive: true, force: true });
	},
	stat(path: string): Promise<FSStats> {
		return fsp.stat(path);
	},
	async open(
		path: string,
		flags: {
			read: boolean;
			write: boolean;
			create: boolean;
			truncate: boolean;
		},
	): Promise<FileHandle> {
		let mode = "";
		if (!flags.truncate && !flags.read) {
			throw new Error(
				"Cannot open a file writeonly without truncating it",
			);
		}
		if (!flags.write && flags.create) {
			throw new Error("Cannot open a file readonly with create flag");
		}

		// FIXME: Figure out what the correct behavior is for each combination of flags
		if (flags.read && !flags.write) {
			mode = "r";
		} else if (flags.read && flags.write && !flags.create) {
			mode = "r+";
		} else if (flags.write && flags.create && flags.truncate) {
			mode = flags.read ? "w+" : "w";
		}

		return new NodeFileHandle(
			await fsp.open(path, mode),
			{
				read: flags.read,
				write: flags.write,
			},
		);
	},
	async makeTempDir(prefix: string): Promise<string> {
		return fsp.mkdtemp(path.join(os.tmpdir(), prefix));
	},
};

export class NodeFileHandle implements FileHandle {
	public constructor(
		handle: fsp.FileHandle,
		flags: { read: boolean; write: boolean },
	) {
		this.open = true;
		this.handle = handle;
		this.flags = flags;
	}

	private open: boolean;
	private handle: fsp.FileHandle;
	private flags: { read: boolean; write: boolean };

	private _readable?: ReadableStream<Uint8Array>;
	private _writable?: WritableStream<Uint8Array>;

	public get readable(): ReadableStream<Uint8Array> {
		if (!this.flags.read) {
			throw new Error("File is not readable");
		}
		if (!this._readable) {
			this._readable = fileHandleToReadableStream(this);
		}
		return this._readable;
	}

	public get writable(): WritableStream<Uint8Array> {
		if (!this.flags.write) {
			throw new Error("File is not writable");
		}
		if (!this._writable) {
			this._writable = fileHandleToWritableStream(this);
		}
		return this._writable;
	}

	async close(): Promise<void> {
		if (!this.open) return;
		this.open = false;
		await this.handle.close();
	}

	async read(
		position?: number | null,
		length?: number,
	): Promise<{ data: Uint8Array; bytesRead: number }> {
		if (!this.open) throw new Error("File is not open");
		const ret = await this.handle.read({
			position,
			length,
		});
		return {
			data: ret.buffer.subarray(0, ret.bytesRead),
			bytesRead: ret.bytesRead,
		};
	}

	async write(
		data: Uint8Array,
		position?: number | null,
	): Promise<{ bytesWritten: number }> {
		if (!this.open) throw new Error("File is not open");
		const ret = await this.handle.write(data, null, null, position);
		return {
			bytesWritten: ret.bytesWritten,
		};
	}

	stat(): Promise<FSStats> {
		if (!this.open) throw new Error("File is not open");
		return this.handle.stat();
	}
}
